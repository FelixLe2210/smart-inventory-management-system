package com.smartinventory.service;

import com.smartinventory.dto.PurchaseOrderReceiveRequest;
import com.smartinventory.dto.PurchaseOrderRequest;
import com.smartinventory.dto.PurchaseOrderResponse;
import com.smartinventory.exception.BadRequestException;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.exception.NotFoundException;
import com.smartinventory.exception.UnauthorizedException;
import com.smartinventory.model.Product;
import com.smartinventory.model.PurchaseOrder;
import com.smartinventory.model.PurchaseOrderItem;
import com.smartinventory.model.Supplier;
import com.smartinventory.model.User;
import com.smartinventory.model.Warehouse;
import com.smartinventory.repository.ProductRepository;
import com.smartinventory.repository.PurchaseOrderRepository;
import com.smartinventory.repository.SupplierRepository;
import com.smartinventory.repository.UserRepository;
import com.smartinventory.repository.WarehouseRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Purchase Order:
 * <pre>
 *   DRAFT --send--> SENT --receive--> PARTIALLY_RECEIVED --receive--> RECEIVED
 *     \              \
 *      +---cancel-----+--> CANCELLED   (chỉ khi chưa nhận hàng)
 * </pre>
 * Nhận hàng cộng tồn kho qua {@link InventoryService#receiveStock} trong cùng một transaction và khóa dòng PO,
 * và không cho nhận vượt số lượng còn lại, nên cùng một lô hàng không thể bị ghi nhận tồn hai lần.
 */
@Service
@Transactional(readOnly = true)
public class PurchaseOrderService {

    private static final DateTimeFormatter PO_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SupplierRepository supplierRepository;
    private final WarehouseRepository warehouseRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final InventoryService inventoryService;
    // Field injection (optional) keeps the constructor used by unit tests.
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    public PurchaseOrderService(PurchaseOrderRepository purchaseOrderRepository,
                                SupplierRepository supplierRepository,
                                WarehouseRepository warehouseRepository,
                                ProductRepository productRepository,
                                UserRepository userRepository,
                                InventoryService inventoryService) {
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.supplierRepository = supplierRepository;
        this.warehouseRepository = warehouseRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.inventoryService = inventoryService;
    }

    // ------------------------------------------------------------------ đọc
    public List<PurchaseOrderResponse> search(String status, Long supplierId, Long warehouseId) {
        String normalized = status == null || status.isBlank() ? null : status.trim().toUpperCase(Locale.ROOT);
        if (normalized != null && !List.of(PurchaseOrder.DRAFT, PurchaseOrder.SENT, PurchaseOrder.PARTIALLY_RECEIVED,
                PurchaseOrder.RECEIVED, PurchaseOrder.CANCELLED).contains(normalized)) {
            throw new BadRequestException("INVALID_PO_STATUS", "Trạng thái đơn đặt hàng không hợp lệ: " + status);
        }
        return purchaseOrderRepository.search(normalized, supplierId, warehouseId).stream()
                .map(PurchaseOrderResponse::from)
                .toList();
    }

    public PurchaseOrderResponse getById(Long id) {
        return PurchaseOrderResponse.from(load(id));
    }

    // ------------------------------------------------------------------ tạo / sửa
    @Transactional
    public PurchaseOrderResponse create(PurchaseOrderRequest request) {
        return create(request, null);
    }

    /** @param aiRecommendationId đề xuất AI sinh ra đơn này (null nếu tạo tay). */
    @Transactional
    public PurchaseOrderResponse create(PurchaseOrderRequest request, Long aiRecommendationId) {
        User actor = currentUser();
        PurchaseOrder po = new PurchaseOrder();
        applyRequest(po, request);
        po.setPoNumber(generatePoNumber());
        po.setStatus(PurchaseOrder.DRAFT);
        po.setCreatedBy(actor);
        po.setAiRecommendationId(aiRecommendationId);
        PurchaseOrder saved = purchaseOrderRepository.save(po);
        publish(saved, null, "CREATED");
        return PurchaseOrderResponse.from(saved);
    }

    @Transactional
    public PurchaseOrderResponse update(Long id, PurchaseOrderRequest request) {
        PurchaseOrder po = load(id);
        requireStatus(po, "Chỉ sửa được đơn ở trạng thái DRAFT.", PurchaseOrder.DRAFT);
        applyRequest(po, request);
        return PurchaseOrderResponse.from(purchaseOrderRepository.save(po));
    }

    @Transactional
    public void delete(Long id) {
        PurchaseOrder po = load(id);
        requireStatus(po, "Chỉ xóa được đơn ở trạng thái DRAFT; đơn đã gửi hãy hủy (cancel).", PurchaseOrder.DRAFT);
        purchaseOrderRepository.delete(po);
    }

    // ------------------------------------------------------------------ chuyển trạng thái
    @Transactional
    public PurchaseOrderResponse send(Long id) {
        User actor = currentUser();
        PurchaseOrder po = load(id);
        requireStatus(po, "Chỉ gửi được đơn ở trạng thái DRAFT.", PurchaseOrder.DRAFT);
        if (po.getItems().isEmpty()) {
            throw new BadRequestException("PO_HAS_NO_ITEMS", "Đơn đặt hàng chưa có sản phẩm.");
        }
        Supplier supplier = po.getSupplier();
        if (!"ACTIVE".equalsIgnoreCase(supplier.getStatus())) {
            throw new BadRequestException("SUPPLIER_NOT_ACTIVE", "Nhà cung cấp không hoạt động, không thể gửi đơn.");
        }
        po.setStatus(PurchaseOrder.SENT);
        po.setOrderDate(LocalDateTime.now());
        po.setApprovedBy(actor);
        if (po.getExpectedDeliveryDate() == null && supplier.getLeadTimeDays() != null) {
            po.setExpectedDeliveryDate(LocalDate.now().plusDays(supplier.getLeadTimeDays()));
        }
        PurchaseOrder saved = purchaseOrderRepository.save(po);
        publish(saved, PurchaseOrder.DRAFT, "SENT");
        return PurchaseOrderResponse.from(saved);
    }

    @Transactional
    public PurchaseOrderResponse cancel(Long id) {
        PurchaseOrder po = load(id);
        // Đã nhận một phần: hàng đã vào kho nên không hủy được. Báo đúng lý do thay vì "sai trạng thái" chung chung.
        if (PurchaseOrder.PARTIALLY_RECEIVED.equals(po.getStatus()) || po.hasAnyReceivedQuantity()) {
            throw new ConflictException("PO_ALREADY_RECEIVED_PARTIALLY",
                    "Đơn đã nhận một phần hàng nên không thể hủy.");
        }
        requireStatus(po, "Chỉ hủy được đơn DRAFT hoặc SENT (chưa nhận hàng).",
                PurchaseOrder.DRAFT, PurchaseOrder.SENT);
        String before = po.getStatus();
        po.setStatus(PurchaseOrder.CANCELLED);
        PurchaseOrder saved = purchaseOrderRepository.save(po);
        publish(saved, before, "CANCELLED");
        return PurchaseOrderResponse.from(saved);
    }

    // ------------------------------------------------------------------ nhận hàng
    @Transactional
    public PurchaseOrderResponse receive(Long id, PurchaseOrderReceiveRequest request) {
        // khóa dòng PO trước: hai yêu cầu nhận hàng đồng thời sẽ xếp hàng, yêu cầu sau thấy số lượng còn lại đã giảm
        PurchaseOrder po = purchaseOrderRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new NotFoundException("PO_NOT_FOUND", "Không tìm thấy đơn đặt hàng với ID: " + id));
        requireStatus(po, "Chỉ nhận hàng được với đơn SENT hoặc PARTIALLY_RECEIVED.",
                PurchaseOrder.SENT, PurchaseOrder.PARTIALLY_RECEIVED);

        Map<Long, PurchaseOrderItem> itemsById = new HashMap<>();
        for (PurchaseOrderItem item : po.getItems()) {
            itemsById.put(item.getId(), item);
        }

        // kiểm tra toàn bộ trước khi cộng tồn kho
        Set<Long> seen = new HashSet<>();
        for (PurchaseOrderReceiveRequest.Line line : request.lines()) {
            PurchaseOrderItem item = itemsById.get(line.itemId());
            if (item == null) {
                throw new NotFoundException("PO_ITEM_NOT_FOUND",
                        "Dòng " + line.itemId() + " không thuộc đơn " + po.getPoNumber() + ".");
            }
            if (!seen.add(line.itemId())) {
                throw new BadRequestException("DUPLICATE_PO_ITEM", "Dòng " + line.itemId() + " xuất hiện nhiều lần.");
            }
            if (line.quantity() > item.getRemainingQty()) {
                throw new BadRequestException("OVER_RECEIVING",
                        "Nhận vượt số lượng đặt cho " + item.getProduct().getSku() + ": còn lại "
                                + item.getRemainingQty() + ", yêu cầu nhận " + line.quantity() + ".");
            }
        }

        String reason = request.note() != null && !request.note().isBlank()
                ? request.note().trim() : "Nhận hàng theo đơn " + po.getPoNumber();
        for (PurchaseOrderReceiveRequest.Line line : request.lines()) {
            PurchaseOrderItem item = itemsById.get(line.itemId());
            inventoryService.receiveStock(item.getProduct().getId(), po.getDestinationWarehouse().getId(),
                    line.quantity(), po.getPoNumber(), reason);
            item.addReceived(line.quantity());
        }

        String before = po.getStatus();
        if (po.isFullyReceived()) {
            po.setStatus(PurchaseOrder.RECEIVED);
            po.setActualDeliveryDate(LocalDate.now());
        } else {
            po.setStatus(PurchaseOrder.PARTIALLY_RECEIVED);
        }
        PurchaseOrder saved = purchaseOrderRepository.save(po);
        publish(saved, before, "RECEIVED");
        return PurchaseOrderResponse.from(saved);
    }

    // ------------------------------------------------------------------ nội bộ
    private void publish(PurchaseOrder po, String previousStatus, String changeType) {
        if (eventPublisher != null) {
            eventPublisher.publishEvent(com.smartinventory.realtime.PurchaseOrderChangedEvent.of(po, previousStatus, changeType));
        }
    }

    private PurchaseOrder load(Long id) {
        return purchaseOrderRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new NotFoundException("PO_NOT_FOUND", "Không tìm thấy đơn đặt hàng với ID: " + id));
    }

    private void requireStatus(PurchaseOrder po, String message, String... allowed) {
        for (String status : allowed) {
            if (status.equals(po.getStatus())) {
                return;
            }
        }
        throw new ConflictException("INVALID_PO_STATUS",
                message + " Trạng thái hiện tại: " + po.getStatus() + ".");
    }

    private void applyRequest(PurchaseOrder po, PurchaseOrderRequest request) {
        Supplier supplier = supplierRepository.findById(request.supplierId())
                .orElseThrow(() -> new NotFoundException("SUPPLIER_NOT_FOUND",
                        "Không tìm thấy nhà cung cấp với ID: " + request.supplierId()));
        if (!"ACTIVE".equalsIgnoreCase(supplier.getStatus())) {
            throw new BadRequestException("SUPPLIER_NOT_ACTIVE", "Nhà cung cấp không hoạt động.");
        }
        Warehouse warehouse = warehouseRepository.findById(request.destinationWarehouseId())
                .orElseThrow(() -> new NotFoundException("WAREHOUSE_NOT_FOUND",
                        "Không tìm thấy kho với ID: " + request.destinationWarehouseId()));
        if (!"ACTIVE".equalsIgnoreCase(warehouse.getStatus())) {
            throw new BadRequestException("WAREHOUSE_NOT_ACTIVE", "Kho đích không hoạt động.");
        }
        if (request.expectedDeliveryDate() != null && request.expectedDeliveryDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("INVALID_EXPECTED_DATE", "Ngày giao dự kiến không được ở quá khứ.");
        }
        if (request.items() == null || request.items().isEmpty()) {
            throw new BadRequestException("PO_HAS_NO_ITEMS", "Đơn đặt hàng phải có ít nhất một sản phẩm.");
        }

        Set<Long> productIds = new HashSet<>();
        List<PurchaseOrderItem> newItems = new java.util.ArrayList<>();
        for (PurchaseOrderRequest.Item line : request.items()) {
            if (!productIds.add(line.productId())) {
                throw new BadRequestException("DUPLICATE_PRODUCT", "Sản phẩm " + line.productId() + " bị lặp trong đơn.");
            }
            Product product = productRepository.findById(line.productId())
                    .orElseThrow(() -> new NotFoundException("PRODUCT_NOT_FOUND",
                            "Không tìm thấy sản phẩm với ID: " + line.productId()));
            if (!"ACTIVE".equalsIgnoreCase(product.getStatus())) {
                throw new BadRequestException("PRODUCT_NOT_ACTIVE", "Sản phẩm " + product.getSku() + " không hoạt động.");
            }
            BigDecimal price = line.unitPrice() != null ? line.unitPrice() : product.getPurchasePrice();
            if (price == null || price.signum() < 0) {
                throw new BadRequestException("INVALID_UNIT_PRICE", "Đơn giá không hợp lệ cho " + product.getSku() + ".");
            }
            newItems.add(new PurchaseOrderItem(product, line.orderedQty(), price));
        }

        po.setSupplier(supplier);
        po.setDestinationWarehouse(warehouse);
        po.setExpectedDeliveryDate(request.expectedDeliveryDate());
        po.setNote(request.note());
        po.getItems().clear();
        newItems.forEach(po::addItem);
        po.recalculateTotal();
    }

    private String generatePoNumber() {
        for (int attempt = 0; attempt < 5; attempt++) {
            String candidate = "PO-" + LocalDate.now().format(PO_DATE) + "-"
                    + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
            if (!purchaseOrderRepository.existsByPoNumber(candidate)) {
                return candidate;
            }
        }
        throw new ConflictException("PO_NUMBER_GENERATION_FAILED", "Không tạo được mã đơn duy nhất, vui lòng thử lại.");
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof String username)) {
            throw new UnauthorizedException("UNAUTHORIZED", "Authentication is required.");
        }
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UnauthorizedException("UNAUTHORIZED",
                        "The authenticated user could not be identified."));
        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new UnauthorizedException("ACCOUNT_DISABLED", "This account has been disabled.");
        }
        return user;
    }
}
