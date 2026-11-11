package com.smartinventory.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartinventory.dto.PurchaseOrderRequest;
import com.smartinventory.dto.PurchaseOrderResponse;
import com.smartinventory.dto.ReorderRecommendationResponse;
import com.smartinventory.exception.BadRequestException;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.exception.NotFoundException;
import com.smartinventory.model.Inventory;
import com.smartinventory.model.InventoryTransaction;
import com.smartinventory.model.Product;
import com.smartinventory.model.PurchaseOrder;
import com.smartinventory.model.PurchaseOrderItem;
import com.smartinventory.model.ReorderRecommendation;
import com.smartinventory.model.Supplier;
import com.smartinventory.repository.InventoryRepository;
import com.smartinventory.repository.InventoryTransactionRepository;
import com.smartinventory.repository.PurchaseOrderItemRepository;
import com.smartinventory.repository.PurchaseOrderRepository;
import com.smartinventory.repository.ReorderRecommendationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

/**
 * Reorder recommendation (AI-based).
 *
 * <p>Backend chỉ thu thập dữ liệu thật (tồn kho, lịch sử xuất kho, PO đang mở, nhà cung cấp) rồi gọi AI service;
 * mọi công thức (dự báo, lead time, safety stock, rủi ro thiếu hàng, số lượng) nằm ở {@code ai-service}.
 */
@Service
@Transactional(readOnly = true)
public class ReorderService {

    static final int HISTORY_DAYS = 120;
    static final int MAX_BATCH = 100;
    static final int MAX_OBSERVED_LEAD_TIMES = 10;
    static final List<String> OPEN_PO_STATUSES = List.of(
            PurchaseOrder.DRAFT, PurchaseOrder.SENT, PurchaseOrder.PARTIALLY_RECEIVED);

    private static final DateTimeFormatter CODE_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final InventoryRepository inventoryRepository;
    private final InventoryTransactionRepository transactionRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final ReorderRecommendationRepository recommendationRepository;
    private final PurchaseOrderService purchaseOrderService;
    private final AiReorderClient aiReorderClient;
    private final ObjectMapper objectMapper;

    public ReorderService(InventoryRepository inventoryRepository,
                          InventoryTransactionRepository transactionRepository,
                          PurchaseOrderRepository purchaseOrderRepository,
                          PurchaseOrderItemRepository purchaseOrderItemRepository,
                          ReorderRecommendationRepository recommendationRepository,
                          PurchaseOrderService purchaseOrderService,
                          AiReorderClient aiReorderClient,
                          ObjectMapper objectMapper) {
        this.inventoryRepository = inventoryRepository;
        this.transactionRepository = transactionRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseOrderItemRepository = purchaseOrderItemRepository;
        this.recommendationRepository = recommendationRepository;
        this.purchaseOrderService = purchaseOrderService;
        this.aiReorderClient = aiReorderClient;
        this.objectMapper = objectMapper;
    }

    // ------------------------------------------------------------------ đọc
    public List<ReorderRecommendationResponse> list(String status) {
        String normalized = status == null || status.isBlank() ? null : status.trim().toUpperCase(Locale.ROOT);
        if (normalized != null && !List.of(ReorderRecommendation.PENDING, ReorderRecommendation.ACCEPTED,
                ReorderRecommendation.MODIFIED, ReorderRecommendation.REJECTED).contains(normalized)) {
            throw new BadRequestException("INVALID_RECOMMENDATION_STATUS", "Trạng thái đề xuất không hợp lệ: " + status);
        }
        return recommendationRepository.search(normalized).stream()
                .map(r -> ReorderRecommendationResponse.from(r, objectMapper))
                .toList();
    }

    public ReorderRecommendationResponse getById(Long id) {
        return ReorderRecommendationResponse.from(load(id), objectMapper);
    }

    // ------------------------------------------------------------------ tạo đề xuất
    /**
     * Tính lại đề xuất cho một hoặc nhiều cặp (sản phẩm, kho). Cặp nào AI kết luận không cần hành động
     * thì đề xuất PENDING cũ (nếu có) bị xóa vì đã lỗi thời.
     */
    @Transactional
    public List<ReorderRecommendationResponse> generate(Long productId, Long warehouseId) {
        List<Inventory> targets = findTargets(productId, warehouseId);
        if (targets.size() > MAX_BATCH) {
            throw new BadRequestException("TOO_MANY_INVENTORIES",
                    "Có " + targets.size() + " tồn kho, vượt giới hạn " + MAX_BATCH
                            + " mỗi lần; hãy lọc theo sản phẩm hoặc kho.");
        }

        List<ReorderRecommendationResponse> result = new ArrayList<>();
        for (Inventory inventory : targets) {
            JsonNode ai = aiReorderClient.recommend(buildPayload(inventory));
            ReorderRecommendation saved = upsert(inventory, ai);
            if (saved != null) {
                result.add(ReorderRecommendationResponse.from(saved, objectMapper));
            }
        }
        return result;
    }

    // ------------------------------------------------------------------ xử lý đề xuất
    /** Chấp nhận đề xuất: tạo Purchase Order DRAFT từ đề xuất. */
    @Transactional
    public PurchaseOrderResponse accept(Long id, Integer quantityOverride) {
        ReorderRecommendation rec = load(id);
        if (!ReorderRecommendation.PENDING.equals(rec.getStatus())) {
            throw new ConflictException("RECOMMENDATION_NOT_PENDING",
                    "Đề xuất đã được xử lý (trạng thái " + rec.getStatus() + ").");
        }
        int quantity = quantityOverride != null ? quantityOverride : rec.getRecommendedOrderQty();
        if (quantity <= 0) {
            throw new BadRequestException("NOTHING_TO_ORDER",
                    "Đề xuất này không có số lượng cần đặt (đã có hàng đang về nhưng sẽ đến muộn): "
                            + "hãy liên hệ nhà cung cấp để đẩy nhanh đơn hiện có.");
        }
        Product product = rec.getProduct();
        Supplier supplier = product.getSupplier();
        if (supplier == null) {
            throw new BadRequestException("PRODUCT_HAS_NO_SUPPLIER",
                    "Sản phẩm " + product.getSku() + " chưa gán nhà cung cấp; cập nhật sản phẩm trước khi tạo đơn.");
        }

        PurchaseOrderRequest request = new PurchaseOrderRequest(
                supplier.getId(),
                rec.getWarehouse().getId(),
                rec.getExpectedArrivalDate() != null && !rec.getExpectedArrivalDate().isBefore(LocalDate.now())
                        ? rec.getExpectedArrivalDate() : null,
                "Tạo từ đề xuất AI " + rec.getRecommendationCode(),
                List.of(new PurchaseOrderRequest.Item(product.getId(), quantity, null)));
        PurchaseOrderResponse po = purchaseOrderService.create(request, rec.getId());

        rec.setStatus(quantity == rec.getRecommendedOrderQty()
                ? ReorderRecommendation.ACCEPTED : ReorderRecommendation.MODIFIED);
        rec.setPurchaseOrderId(po.id());
        recommendationRepository.save(rec);
        return po;
    }

    @Transactional
    public ReorderRecommendationResponse reject(Long id) {
        ReorderRecommendation rec = load(id);
        if (!ReorderRecommendation.PENDING.equals(rec.getStatus())) {
            throw new ConflictException("RECOMMENDATION_NOT_PENDING",
                    "Đề xuất đã được xử lý (trạng thái " + rec.getStatus() + ").");
        }
        rec.setStatus(ReorderRecommendation.REJECTED);
        return ReorderRecommendationResponse.from(recommendationRepository.save(rec), objectMapper);
    }

    // ------------------------------------------------------------------ nội bộ
    private ReorderRecommendation load(Long id) {
        return recommendationRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new NotFoundException("RECOMMENDATION_NOT_FOUND",
                        "Không tìm thấy đề xuất với ID: " + id));
    }

    private List<Inventory> findTargets(Long productId, Long warehouseId) {
        List<Inventory> all;
        if (productId != null && warehouseId != null) {
            all = inventoryRepository.findByProductIdAndWarehouseId(productId, warehouseId)
                    .map(i -> List.of(i)).orElse(List.of());
        } else if (productId != null) {
            all = inventoryRepository.findByProductId(productId);
        } else if (warehouseId != null) {
            all = inventoryRepository.findByWarehouseId(warehouseId);
        } else {
            all = inventoryRepository.findAllWithDetails();
        }
        return all.stream()
                .filter(i -> "ACTIVE".equalsIgnoreCase(i.getProduct().getStatus())
                        && "ACTIVE".equalsIgnoreCase(i.getWarehouse().getStatus()))
                .toList();
    }

    /** Dữ liệu thật gửi AI service (khóa snake_case theo hợp đồng của AI). */
    Map<String, Object> buildPayload(Inventory inventory) {
        Product product = inventory.getProduct();
        Long productId = product.getId();
        Long warehouseId = inventory.getWarehouse().getId();
        LocalDate today = LocalDate.now();
        Supplier supplier = product.getSupplier();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("product_id", productId);
        payload.put("warehouse_id", warehouseId);
        payload.put("as_of", today.toString());
        payload.put("on_hand", inventory.getCurrentStock() != null ? inventory.getCurrentStock() : 0);
        payload.put("reserved", inventory.getReservedStock() != null ? inventory.getReservedStock() : 0);
        payload.put("historical_data", dailySales(productId, warehouseId, today));
        payload.put("purchase_orders", openPurchaseOrderLines(productId, warehouseId));
        if (supplier != null) {
            payload.put("supplier_lead_time_days", supplier.getLeadTimeDays());
            payload.put("supplier_reliability", supplier.getReliabilityScore());
            payload.put("observed_lead_times", observedLeadTimes(supplier.getId()));
        }
        payload.put("min_stock_level", product.getMinStockLevel() != null ? product.getMinStockLevel() : 0);
        if (product.getMaxStockLevel() != null) {
            payload.put("max_stock_level", product.getMaxStockLevel());
        }
        return payload;
    }

    private List<Map<String, Object>> dailySales(Long productId, Long warehouseId, LocalDate today) {
        List<InventoryTransaction> issues = transactionRepository.findIssuesSince(
                productId, warehouseId, today.minusDays(HISTORY_DAYS).atStartOfDay());
        Map<LocalDate, Integer> perDay = new TreeMap<>();
        for (InventoryTransaction t : issues) {
            perDay.merge(t.getCreatedAt().toLocalDate(), t.getQuantity(), Integer::sum);
        }
        List<Map<String, Object>> rows = new ArrayList<>();
        perDay.forEach((date, qty) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("date", date.toString());
            row.put("quantity", qty);
            rows.add(row);
        });
        return rows;
    }

    private List<Map<String, Object>> openPurchaseOrderLines(Long productId, Long warehouseId) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (PurchaseOrderItem item : purchaseOrderItemRepository.findOpenItems(productId, warehouseId, OPEN_PO_STATUSES)) {
            PurchaseOrder po = item.getPurchaseOrder();
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("po_id", po.getId());
            row.put("po_number", po.getPoNumber());
            row.put("status", po.getStatus());
            row.put("ordered_qty", item.getOrderedQty());
            row.put("received_qty", item.getReceivedQty());
            row.put("expected_delivery_date",
                    po.getExpectedDeliveryDate() != null ? po.getExpectedDeliveryDate().toString() : null);
            rows.add(row);
        }
        return rows;
    }

    /** Lead time thực tế (ngày) của các đơn đã nhận đủ: từ ngày đặt đến ngày nhận. */
    private List<Long> observedLeadTimes(Long supplierId) {
        List<Long> days = new ArrayList<>();
        for (PurchaseOrder po : purchaseOrderRepository.findDeliveredBySupplier(supplierId)) {
            if (days.size() >= MAX_OBSERVED_LEAD_TIMES) {
                break;
            }
            long d = ChronoUnit.DAYS.between(po.getOrderDate().toLocalDate(), po.getActualDeliveryDate());
            if (d >= 0) {
                days.add(d);
            }
        }
        return days;
    }

    /** @return đề xuất đã lưu, hoặc null nếu AI kết luận không cần hành động. */
    private ReorderRecommendation upsert(Inventory inventory, JsonNode ai) {
        Long productId = inventory.getProduct().getId();
        Long warehouseId = inventory.getWarehouse().getId();
        var existing = recommendationRepository.findFirstByProductIdAndWarehouseIdAndStatus(
                productId, warehouseId, ReorderRecommendation.PENDING);

        if ("NONE".equals(ai.path("action").asText("NONE"))) {
            if (existing.isPresent()) {
                recommendationRepository.delete(existing.get());
            }
            return null;
        }

        ReorderRecommendation rec = existing.orElseGet(ReorderRecommendation::new);
        if (rec.getId() == null) {
            rec.setRecommendationCode("REC-" + LocalDate.now().format(CODE_DATE) + "-"
                    + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT));
            rec.setProduct(inventory.getProduct());
            rec.setWarehouse(inventory.getWarehouse());
        }
        rec.setCurrentStock((int) Math.round(ai.path("current_stock").asDouble(0)));
        rec.setIncomingStock(ai.path("incoming_stock").asInt(0));
        rec.setSupplierLeadTimeDays((int) Math.ceil(ai.path("lead_time_days").asDouble(0)));
        rec.setSafetyStock(ai.path("safety_stock").asInt(0));
        rec.setReorderPoint(ai.path("reorder_point").asInt(0));
        rec.setRecommendedOrderQty(ai.path("recommended_quantity").asInt(0));
        rec.setSuggestedOrderDate(ai.hasNonNull("suggested_order_date")
                ? LocalDate.parse(ai.get("suggested_order_date").asText()) : LocalDate.now());
        rec.setExpectedArrivalDate(ai.hasNonNull("expected_arrival_date")
                ? LocalDate.parse(ai.get("expected_arrival_date").asText()) : null);
        rec.setUrgencyLevel(ai.path("urgency_level").asText("MEDIUM"));
        rec.setShortageRisk(ai.path("shortage_risk").asText(null));
        rec.setStockoutProbability(BigDecimal.valueOf(ai.path("stockout_probability").asDouble(0))
                .setScale(4, RoundingMode.HALF_UP));
        rec.setAvgDailyDemand(BigDecimal.valueOf(ai.path("avg_daily_demand").asDouble(0))
                .setScale(2, RoundingMode.HALF_UP));
        rec.setDetailsJson(ai.toString());
        rec.setStatus(ReorderRecommendation.PENDING);
        return recommendationRepository.save(rec);
    }
}
