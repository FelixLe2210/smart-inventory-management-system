package com.smartinventory.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartinventory.dto.PurchaseOrderRequest;
import com.smartinventory.dto.PurchaseOrderResponse;
import com.smartinventory.dto.ReorderRecommendationResponse;
import com.smartinventory.exception.BadRequestException;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.model.Inventory;
import com.smartinventory.model.InventoryTransaction;
import com.smartinventory.model.Product;
import com.smartinventory.model.PurchaseOrder;
import com.smartinventory.model.PurchaseOrderItem;
import com.smartinventory.model.ReorderRecommendation;
import com.smartinventory.model.Supplier;
import com.smartinventory.model.User;
import com.smartinventory.model.Warehouse;
import com.smartinventory.repository.InventoryRepository;
import com.smartinventory.repository.InventoryTransactionRepository;
import com.smartinventory.repository.PurchaseOrderItemRepository;
import com.smartinventory.repository.PurchaseOrderRepository;
import com.smartinventory.repository.ReorderRecommendationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** Reorder API service - dữ liệu thật gửi AI, lưu đề xuất, tạo PO từ đề xuất. */
class ReorderServiceTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private InventoryRepository inventoryRepo;
    private InventoryTransactionRepository txRepo;
    private PurchaseOrderRepository poRepo;
    private PurchaseOrderItemRepository poItemRepo;
    private ReorderRecommendationRepository recRepo;
    private PurchaseOrderService poService;
    private AiReorderClient ai;
    private ReorderService service;

    private Supplier supplier;
    private Warehouse warehouse;
    private Product product;
    private Inventory inventory;

    @BeforeEach
    void setUp() {
        inventoryRepo = mock(InventoryRepository.class);
        txRepo = mock(InventoryTransactionRepository.class);
        poRepo = mock(PurchaseOrderRepository.class);
        poItemRepo = mock(PurchaseOrderItemRepository.class);
        recRepo = mock(ReorderRecommendationRepository.class);
        poService = mock(PurchaseOrderService.class);
        ai = mock(AiReorderClient.class);
        service = new ReorderService(inventoryRepo, txRepo, poRepo, poItemRepo, recRepo, poService, ai, MAPPER);

        supplier = new Supplier();
        ReflectionTestUtils.setField(supplier, "id", 1L);
        supplier.setName("NCC A");
        supplier.setLeadTimeDays(7);
        supplier.setReliabilityScore(new BigDecimal("0.90"));
        supplier.setStatus("ACTIVE");

        warehouse = new Warehouse();
        ReflectionTestUtils.setField(warehouse, "id", 2L);
        warehouse.setCode("WH-01");
        warehouse.setName("Kho 1");
        warehouse.setStatus("ACTIVE");

        product = new Product();
        ReflectionTestUtils.setField(product, "id", 10L);
        product.setSku("SKU-10");
        product.setName("Chuột không dây");
        product.setStatus("ACTIVE");
        product.setSupplier(supplier);
        product.setMinStockLevel(20);
        product.setMaxStockLevel(500);

        inventory = new Inventory(product, warehouse, 40, 5, null);
        when(inventoryRepo.findByProductIdAndWarehouseId(10L, 2L)).thenReturn(Optional.of(inventory));
        when(txRepo.findIssuesSince(eq(10L), eq(2L), any(LocalDateTime.class))).thenReturn(List.of());
        when(poItemRepo.findOpenItems(eq(10L), eq(2L), anyCollection())).thenReturn(List.of());
        when(poRepo.findDeliveredBySupplier(1L)).thenReturn(List.of());
        when(recRepo.findFirstByProductIdAndWarehouseIdAndStatus(anyLong(), anyLong(), any())).thenReturn(Optional.empty());
        when(recRepo.save(any(ReorderRecommendation.class))).thenAnswer(inv -> {
            ReorderRecommendation r = inv.getArgument(0);
            if (r.getId() == null) {
                ReflectionTestUtils.setField(r, "id", 500L);
            }
            return r;
        });
    }

    private static JsonNode aiAnswer(String action, int qty) throws Exception {
        String today = LocalDate.now().toString();
        return MAPPER.readTree("""
                {"action":"%s","recommended_quantity":%d,"urgency_level":"HIGH","shortage_risk":"HIGH",
                 "stockout_probability":0.9123,"days_until_stockout":4,"current_stock":40,"available_stock":35,
                 "incoming_stock":0,"avg_daily_demand":11.37,"lead_time_days":7.0,"safety_stock":12,
                 "reorder_point":92,"target_stock":170,"suggested_order_date":"%s","expected_arrival_date":"%s",
                 "reasons":["Inventory position 35 <= reorder point 92"],"warnings":[],"history_source":"provided"}
                """.formatted(action, qty, today, LocalDate.now().plusDays(7)));
    }

    private ReorderRecommendation pendingRecommendation(int qty) {
        ReorderRecommendation r = new ReorderRecommendation();
        ReflectionTestUtils.setField(r, "id", 500L);
        r.setRecommendationCode("REC-TEST");
        r.setProduct(product);
        r.setWarehouse(warehouse);
        r.setRecommendedOrderQty(qty);
        r.setStatus(ReorderRecommendation.PENDING);
        r.setExpectedArrivalDate(LocalDate.now().plusDays(7));
        when(recRepo.findByIdWithDetails(500L)).thenReturn(Optional.of(r));
        return r;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> capturePayload() {
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(ai).recommend(captor.capture());
        return captor.getValue();
    }

    // ------------------------------------------------------------------ generate
    @Test
    @DisplayName("generate: gửi AI dữ liệu thật (tồn, giữ chỗ, nhà cung cấp, min/max) và lưu đề xuất PENDING")
    void generateStoresRecommendationFromAiAnswer() throws Exception {
        when(ai.recommend(any())).thenReturn(aiAnswer("REORDER", 130));

        List<ReorderRecommendationResponse> result = service.generate(10L, 2L);

        assertEquals(1, result.size());
        ReorderRecommendationResponse r = result.get(0);
        assertEquals("PENDING", r.status());
        assertEquals(130, r.recommendedOrderQty());
        assertEquals("HIGH", r.urgencyLevel());
        assertEquals("REORDER", r.action());
        assertEquals(12, r.safetyStock());
        assertEquals(92, r.reorderPoint());
        assertEquals(7, r.supplierLeadTimeDays());
        assertEquals("NCC A", r.supplierName());
        assertTrue(r.recommendationCode().startsWith("REC-"));
        assertNotNull(r.details());
        assertEquals("provided", r.details().get("history_source").asText());

        Map<String, Object> payload = capturePayload();
        assertEquals(10L, payload.get("product_id"));
        assertEquals(2L, payload.get("warehouse_id"));
        assertEquals(40, payload.get("on_hand"));
        assertEquals(5, payload.get("reserved"));
        assertEquals(7, payload.get("supplier_lead_time_days"));
        assertEquals(20, payload.get("min_stock_level"));
        assertEquals(500, payload.get("max_stock_level"));
    }

    @Test
    @DisplayName("generate: nhiều lần xuất trong cùng một ngày được cộng lại thành lịch sử bán theo ngày")
    void issuesAreAggregatedPerDay() throws Exception {
        LocalDateTime morning = LocalDate.now().minusDays(2).atTime(9, 0);
        LocalDateTime evening = LocalDate.now().minusDays(2).atTime(17, 0);
        LocalDateTime other = LocalDate.now().minusDays(1).atTime(10, 0);
        when(txRepo.findIssuesSince(eq(10L), eq(2L), any(LocalDateTime.class))).thenReturn(List.of(
                issue(morning, 6), issue(evening, 4), issue(other, 7)));
        when(ai.recommend(any())).thenReturn(aiAnswer("REORDER", 10));

        service.generate(10L, 2L);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> history = (List<Map<String, Object>>) capturePayload().get("historical_data");
        assertEquals(2, history.size());
        assertEquals(LocalDate.now().minusDays(2).toString(), history.get(0).get("date"));
        assertEquals(10, history.get(0).get("quantity"));
        assertEquals(7, history.get(1).get("quantity"));
    }

    @Test
    @DisplayName("generate: PO đang mở của đúng sản phẩm/kho được gửi cho AI (kể cả DRAFT để AI loại ra)")
    void openPurchaseOrdersAreSentToAi() throws Exception {
        PurchaseOrder po = new PurchaseOrder();
        ReflectionTestUtils.setField(po, "id", 9L);
        po.setPoNumber("PO-1");
        po.setStatus(PurchaseOrder.SENT);
        po.setExpectedDeliveryDate(LocalDate.now().plusDays(3));
        PurchaseOrderItem item = new PurchaseOrderItem(product, 200, BigDecimal.TEN);
        item.addReceived(50);
        item.setPurchaseOrder(po);
        when(poItemRepo.findOpenItems(eq(10L), eq(2L), anyCollection())).thenReturn(List.of(item));
        when(ai.recommend(any())).thenReturn(aiAnswer("NONE", 0));

        service.generate(10L, 2L);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> lines = (List<Map<String, Object>>) capturePayload().get("purchase_orders");
        assertEquals(1, lines.size());
        assertEquals("SENT", lines.get(0).get("status"));
        assertEquals(200, lines.get(0).get("ordered_qty"));
        assertEquals(50, lines.get(0).get("received_qty"));
        assertEquals(LocalDate.now().plusDays(3).toString(), lines.get(0).get("expected_delivery_date"));
    }

    @Test
    @DisplayName("generate: AI kết luận không cần hành động thì không lưu và xóa đề xuất PENDING cũ")
    void noActionRemovesStalePendingRecommendation() throws Exception {
        ReorderRecommendation stale = pendingRecommendation(50);
        when(recRepo.findFirstByProductIdAndWarehouseIdAndStatus(10L, 2L, "PENDING")).thenReturn(Optional.of(stale));
        when(ai.recommend(any())).thenReturn(aiAnswer("NONE", 0));

        List<ReorderRecommendationResponse> result = service.generate(10L, 2L);

        assertTrue(result.isEmpty());
        verify(recRepo).delete(stale);
        verify(recRepo, never()).save(any());
    }

    @Test
    @DisplayName("generate: đề xuất PENDING cũ được cập nhật tại chỗ, không tạo bản ghi trùng")
    void existingPendingIsUpdatedInPlace() throws Exception {
        ReorderRecommendation existing = pendingRecommendation(50);
        when(recRepo.findFirstByProductIdAndWarehouseIdAndStatus(10L, 2L, "PENDING")).thenReturn(Optional.of(existing));
        when(ai.recommend(any())).thenReturn(aiAnswer("REORDER", 130));

        service.generate(10L, 2L);

        assertEquals(130, existing.getRecommendedOrderQty());
        assertEquals("REC-TEST", existing.getRecommendationCode());
        verify(recRepo, times(1)).save(existing);
    }

    @Test
    @DisplayName("generate: bỏ qua sản phẩm hoặc kho không hoạt động")
    void inactiveProductsAndWarehousesAreSkipped() {
        product.setStatus("INACTIVE");
        assertTrue(service.generate(10L, 2L).isEmpty());
        verifyNoInteractions(ai);
    }

    @Test
    @DisplayName("generate: sản phẩm chưa có nhà cung cấp vẫn tính được (AI dùng lead time mặc định)")
    void productWithoutSupplierStillWorks() throws Exception {
        product.setSupplier(null);
        when(ai.recommend(any())).thenReturn(aiAnswer("REORDER", 30));

        service.generate(10L, 2L);

        assertFalse(capturePayload().containsKey("supplier_lead_time_days"));
    }

    // ------------------------------------------------------------------ accept / reject
    @Test
    @DisplayName("accept: tạo PO DRAFT từ đề xuất với nhà cung cấp của sản phẩm; đề xuất -> ACCEPTED và gắn PO")
    void acceptCreatesDraftPurchaseOrder() {
        ReorderRecommendation rec = pendingRecommendation(130);
        PurchaseOrderResponse po = samplePo(321L);
        when(poService.create(any(PurchaseOrderRequest.class), eq(500L))).thenReturn(po);

        PurchaseOrderResponse result = service.accept(500L, null);

        assertSame(po, result);
        ArgumentCaptor<PurchaseOrderRequest> captor = ArgumentCaptor.forClass(PurchaseOrderRequest.class);
        verify(poService).create(captor.capture(), eq(500L));
        PurchaseOrderRequest request = captor.getValue();
        assertEquals(1L, request.supplierId());
        assertEquals(2L, request.destinationWarehouseId());
        assertEquals(1, request.items().size());
        assertEquals(10L, request.items().get(0).productId());
        assertEquals(130, request.items().get(0).orderedQty());
        assertEquals(ReorderRecommendation.ACCEPTED, rec.getStatus());
        assertEquals(321L, rec.getPurchaseOrderId());
    }

    @Test
    @DisplayName("accept với số lượng khác đề xuất -> trạng thái MODIFIED")
    void acceptWithDifferentQuantityIsModified() {
        ReorderRecommendation rec = pendingRecommendation(130);
        PurchaseOrderResponse po = samplePo(322L);
        when(poService.create(any(PurchaseOrderRequest.class), eq(500L))).thenReturn(po);

        service.accept(500L, 150);

        ArgumentCaptor<PurchaseOrderRequest> captor = ArgumentCaptor.forClass(PurchaseOrderRequest.class);
        verify(poService).create(captor.capture(), eq(500L));
        assertEquals(150, captor.getValue().items().get(0).orderedQty());
        assertEquals(ReorderRecommendation.MODIFIED, rec.getStatus());
    }

    @Test
    @DisplayName("accept: không xử lý lại đề xuất đã ACCEPTED/REJECTED (chống tạo PO trùng)")
    void acceptTwiceIsRejected() {
        ReorderRecommendation rec = pendingRecommendation(130);
        rec.setStatus(ReorderRecommendation.ACCEPTED);

        assertEquals("RECOMMENDATION_NOT_PENDING",
                assertThrows(ConflictException.class, () -> service.accept(500L, null)).getCode());
        verifyNoInteractions(poService);
    }

    @Test
    @DisplayName("accept: đề xuất số lượng 0 (hàng về muộn) và sản phẩm không có nhà cung cấp bị từ chối rõ ràng")
    void acceptValidations() {
        pendingRecommendation(0);
        assertEquals("NOTHING_TO_ORDER",
                assertThrows(BadRequestException.class, () -> service.accept(500L, null)).getCode());

        pendingRecommendation(10);
        product.setSupplier(null);
        assertEquals("PRODUCT_HAS_NO_SUPPLIER",
                assertThrows(BadRequestException.class, () -> service.accept(500L, null)).getCode());
    }

    @Test
    @DisplayName("reject: PENDING -> REJECTED, không tạo PO")
    void rejectMarksRejected() {
        ReorderRecommendation rec = pendingRecommendation(130);

        ReorderRecommendationResponse result = service.reject(500L);

        assertEquals("REJECTED", result.status());
        assertEquals(ReorderRecommendation.REJECTED, rec.getStatus());
        verifyNoInteractions(poService);
    }

    @Test
    @DisplayName("list: trạng thái lọc không hợp lệ trả 400")
    void listRejectsUnknownStatus() {
        assertThrows(BadRequestException.class, () -> service.list("BOGUS"));
    }

    private InventoryTransaction issue(LocalDateTime at, int qty) {
        User actor = new User();
        InventoryTransaction t = new InventoryTransaction("TXN-" + at + qty, "ISSUING", product, warehouse, null, qty,
                100, 100 - qty, null, null, actor);
        ReflectionTestUtils.setField(t, "createdAt", at);
        return t;
    }

    private static PurchaseOrderResponse samplePo(Long id) {
        return new PurchaseOrderResponse(id, "PO-20261104-ABCDEF12", 1L, "SUP-01", "NCC A", 2L, "WH-01", "Kho 1",
                "DRAFT", null, null, null, java.math.BigDecimal.TEN, null, null, "buyer", null, null, List.of());
    }
}
