package com.smartinventory.service;

import com.smartinventory.dto.PurchaseOrderReceiveRequest;
import com.smartinventory.dto.PurchaseOrderRequest;
import com.smartinventory.dto.PurchaseOrderResponse;
import com.smartinventory.exception.BadRequestException;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.model.Category;
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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Kiểm thử luồng Purchase Order (tạo -> gửi -> nhận hàng -> cập nhật tồn kho).
 * Repository giả lập lưu trong bộ nhớ; InventoryService được mock để kiểm tra đúng lệnh cộng tồn.
 */
class PurchaseOrderServiceTest {

    private final AtomicLong ids = new AtomicLong(100);
    private final Map<Long, PurchaseOrder> orders = new HashMap<>();

    private PurchaseOrderService service;
    private InventoryService inventoryService;
    private Supplier supplier;
    private Warehouse warehouse;
    private Product product;
    private Product product2;

    @BeforeEach
    void setUp() {
        PurchaseOrderRepository poRepo = mock(PurchaseOrderRepository.class);
        SupplierRepository supplierRepo = mock(SupplierRepository.class);
        WarehouseRepository warehouseRepo = mock(WarehouseRepository.class);
        ProductRepository productRepo = mock(ProductRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        inventoryService = mock(InventoryService.class);

        supplier = new Supplier();
        ReflectionTestUtils.setField(supplier, "id", 1L);
        supplier.setCode("SUP-01");
        supplier.setName("Nhà cung cấp 1");
        supplier.setLeadTimeDays(5);
        supplier.setStatus("ACTIVE");

        warehouse = new Warehouse();
        ReflectionTestUtils.setField(warehouse, "id", 2L);
        warehouse.setCode("WH-01");
        warehouse.setName("Kho 1");
        warehouse.setStatus("ACTIVE");

        Category category = new Category();
        product = newProduct(10L, "SKU-10", "50.00");
        product2 = newProduct(11L, "SKU-11", "20.00");
        product.setCategory(category);
        product2.setCategory(category);

        User actor = new User();
        ReflectionTestUtils.setField(actor, "id", 1L);
        actor.setUsername("buyer");
        actor.setActive(true);
        when(userRepo.findByUsername("buyer")).thenReturn(Optional.of(actor));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("buyer", null, List.of()));

        when(supplierRepo.findById(1L)).thenReturn(Optional.of(supplier));
        when(warehouseRepo.findById(2L)).thenReturn(Optional.of(warehouse));
        when(productRepo.findById(10L)).thenReturn(Optional.of(product));
        when(productRepo.findById(11L)).thenReturn(Optional.of(product2));
        when(poRepo.existsByPoNumber(anyString())).thenReturn(false);
        when(poRepo.save(any(PurchaseOrder.class))).thenAnswer(inv -> {
            PurchaseOrder po = inv.getArgument(0);
            if (po.getId() == null) {
                ReflectionTestUtils.setField(po, "id", ids.incrementAndGet());
            }
            for (PurchaseOrderItem item : po.getItems()) {
                if (item.getId() == null) {
                    ReflectionTestUtils.setField(item, "id", ids.incrementAndGet());
                }
            }
            orders.put(po.getId(), po);
            return po;
        });
        when(poRepo.findByIdWithDetails(anyLong()))
                .thenAnswer(inv -> Optional.ofNullable(orders.get(inv.<Long>getArgument(0))));
        when(poRepo.findByIdForUpdate(anyLong()))
                .thenAnswer(inv -> Optional.ofNullable(orders.get(inv.<Long>getArgument(0))));

        service = new PurchaseOrderService(poRepo, supplierRepo, warehouseRepo, productRepo, userRepo, inventoryService);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private Product newProduct(Long id, String sku, String price) {
        Product p = new Product();
        ReflectionTestUtils.setField(p, "id", id);
        p.setSku(sku);
        p.setName("Sản phẩm " + sku);
        p.setStatus("ACTIVE");
        p.setPurchasePrice(new BigDecimal(price));
        return p;
    }

    private PurchaseOrderRequest request(PurchaseOrderRequest.Item... items) {
        return new PurchaseOrderRequest(1L, 2L, null, "ghi chú", List.of(items));
    }

    private PurchaseOrderResponse createDraft() {
        return service.create(request(
                new PurchaseOrderRequest.Item(10L, 100, null),
                new PurchaseOrderRequest.Item(11L, 40, new BigDecimal("25.50"))));
    }

    private PurchaseOrderResponse createSent() {
        PurchaseOrderResponse draft = createDraft();
        return service.send(draft.id());
    }

    private Long itemId(PurchaseOrderResponse po, Long productId) {
        return po.items().stream().filter(i -> i.productId().equals(productId)).findFirst().orElseThrow().id();
    }

    // -------------------------------------------------------------- tạo / sửa
    @Test
    @DisplayName("Tạo PO: trạng thái DRAFT, có mã PO-, tổng tiền = Σ số lượng × đơn giá, giá mặc định lấy từ sản phẩm")
    void createBuildsDraftWithTotals() {
        PurchaseOrderResponse po = createDraft();

        assertEquals("DRAFT", po.status());
        assertTrue(po.poNumber().startsWith("PO-"));
        assertEquals("buyer", po.createdBy());
        // 100 × 50.00 + 40 × 25.50 = 6020.00
        assertEquals(0, new BigDecimal("6020.00").compareTo(po.totalAmount()));
        assertEquals(2, po.items().size());
        assertEquals(0, new BigDecimal("50.00").compareTo(po.items().get(0).unitPrice()));
        assertEquals(0, po.items().get(0).receivedQty());
    }

    @Test
    @DisplayName("Tạo PO từ đề xuất AI lưu aiRecommendationId")
    void createFromRecommendationKeepsLink() {
        PurchaseOrderResponse po = service.create(
                request(new PurchaseOrderRequest.Item(10L, 5, null)), 77L);
        assertEquals(77L, po.aiRecommendationId());
    }

    @Test
    @DisplayName("Từ chối sản phẩm lặp, nhà cung cấp không hoạt động, ngày giao ở quá khứ")
    void createValidations() {
        assertEquals("DUPLICATE_PRODUCT", assertThrows(BadRequestException.class, () -> service.create(request(
                new PurchaseOrderRequest.Item(10L, 1, null),
                new PurchaseOrderRequest.Item(10L, 2, null)))).getCode());

        supplier.setStatus("INACTIVE");
        assertEquals("SUPPLIER_NOT_ACTIVE", assertThrows(BadRequestException.class, () -> service.create(
                request(new PurchaseOrderRequest.Item(10L, 1, null)))).getCode());
        supplier.setStatus("ACTIVE");

        PurchaseOrderRequest past = new PurchaseOrderRequest(1L, 2L, LocalDate.now().minusDays(1), null,
                List.of(new PurchaseOrderRequest.Item(10L, 1, null)));
        assertEquals("INVALID_EXPECTED_DATE", assertThrows(BadRequestException.class, () -> service.create(past)).getCode());

        product.setStatus("INACTIVE");
        assertEquals("PRODUCT_NOT_ACTIVE", assertThrows(BadRequestException.class, () -> service.create(
                request(new PurchaseOrderRequest.Item(10L, 1, null)))).getCode());
    }

    @Test
    @DisplayName("Chỉ sửa được PO ở trạng thái DRAFT")
    void updateOnlyDraft() {
        PurchaseOrderResponse draft = createDraft();
        PurchaseOrderResponse updated = service.update(draft.id(), request(new PurchaseOrderRequest.Item(10L, 7, null)));
        assertEquals(1, updated.items().size());
        assertEquals(0, new BigDecimal("350.00").compareTo(updated.totalAmount()));

        service.send(draft.id());
        assertEquals("INVALID_PO_STATUS", assertThrows(ConflictException.class, () ->
                service.update(draft.id(), request(new PurchaseOrderRequest.Item(10L, 1, null)))).getCode());
    }

    // -------------------------------------------------------------- trạng thái
    @Test
    @DisplayName("Gửi PO: DRAFT -> SENT, đặt ngày giao mặc định theo lead time nhà cung cấp, không gửi lại lần hai")
    void sendTransition() {
        PurchaseOrderResponse draft = createDraft();
        PurchaseOrderResponse sent = service.send(draft.id());

        assertEquals("SENT", sent.status());
        assertEquals(LocalDate.now().plusDays(5), sent.expectedDeliveryDate());
        assertThrows(ConflictException.class, () -> service.send(draft.id()));
    }

    @Test
    @DisplayName("Hủy PO: được khi DRAFT/SENT chưa nhận hàng; không được sau khi nhận một phần")
    void cancelRules() {
        PurchaseOrderResponse draft = createDraft();
        assertEquals("CANCELLED", service.cancel(draft.id()).status());
        assertThrows(ConflictException.class, () -> service.cancel(draft.id()));

        PurchaseOrderResponse sent = createSent();
        service.receive(sent.id(), new PurchaseOrderReceiveRequest(
                List.of(new PurchaseOrderReceiveRequest.Line(itemId(sent, 10L), 10)), null));
        assertEquals("PO_ALREADY_RECEIVED_PARTIALLY",
                assertThrows(ConflictException.class, () -> service.cancel(sent.id())).getCode());
    }

    @Test
    @DisplayName("Chỉ xóa được PO DRAFT")
    void deleteOnlyDraft() {
        PurchaseOrderResponse draft = createDraft();
        service.delete(draft.id());

        PurchaseOrderResponse sent = createSent();
        assertThrows(ConflictException.class, () -> service.delete(sent.id()));
    }

    // -------------------------------------------------------------- nhận hàng
    @Test
    @DisplayName("Nhận một phần: cộng tồn đúng kho, PO -> PARTIALLY_RECEIVED; nhận nốt -> RECEIVED có ngày nhận thực tế")
    void partialThenFullReceiving() {
        PurchaseOrderResponse sent = createSent();
        Long item10 = itemId(sent, 10L);
        Long item11 = itemId(sent, 11L);

        PurchaseOrderResponse partial = service.receive(sent.id(), new PurchaseOrderReceiveRequest(
                List.of(new PurchaseOrderReceiveRequest.Line(item10, 60)), null));

        assertEquals("PARTIALLY_RECEIVED", partial.status());
        assertNull(partial.actualDeliveryDate());
        verify(inventoryService).receiveStock(eq(10L), eq(2L), eq(60), eq(sent.poNumber()), anyString());
        PurchaseOrderResponse.Item line10 = partial.items().stream().filter(i -> i.productId() == 10L).findFirst().orElseThrow();
        assertEquals(60, line10.receivedQty());
        assertEquals(40, line10.remainingQty());

        PurchaseOrderResponse full = service.receive(sent.id(), new PurchaseOrderReceiveRequest(
                List.of(new PurchaseOrderReceiveRequest.Line(item10, 40),
                        new PurchaseOrderReceiveRequest.Line(item11, 40)), "Nhận đủ"));

        assertEquals("RECEIVED", full.status());
        assertEquals(LocalDate.now(), full.actualDeliveryDate());
        verify(inventoryService).receiveStock(eq(11L), eq(2L), eq(40), eq(sent.poNumber()), eq("Nhận đủ"));
    }

    @Test
    @DisplayName("Không nhận vượt số lượng còn lại và không cộng tồn nếu có dòng sai")
    void overReceivingIsRejectedBeforeAnyStockChange() {
        PurchaseOrderResponse sent = createSent();
        Long item10 = itemId(sent, 10L);
        Long item11 = itemId(sent, 11L);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> service.receive(sent.id(),
                new PurchaseOrderReceiveRequest(List.of(
                        new PurchaseOrderReceiveRequest.Line(item10, 50),
                        new PurchaseOrderReceiveRequest.Line(item11, 41)), null)));

        assertEquals("OVER_RECEIVING", ex.getCode());
        verify(inventoryService, never()).receiveStock(anyLong(), anyLong(), anyInt(), anyString(), anyString());
        assertEquals("SENT", service.getById(sent.id()).status());
    }

    @Test
    @DisplayName("Chống nhập kho hai lần: PO đã RECEIVED không nhận lại được")
    void receivedOrderCannotBeReceivedAgain() {
        PurchaseOrderResponse sent = createSent();
        service.receive(sent.id(), new PurchaseOrderReceiveRequest(List.of(
                new PurchaseOrderReceiveRequest.Line(itemId(sent, 10L), 100),
                new PurchaseOrderReceiveRequest.Line(itemId(sent, 11L), 40)), null));

        ConflictException ex = assertThrows(ConflictException.class, () -> service.receive(sent.id(),
                new PurchaseOrderReceiveRequest(List.of(
                        new PurchaseOrderReceiveRequest.Line(itemId(sent, 10L), 1)), null)));

        assertEquals("INVALID_PO_STATUS", ex.getCode());
        verify(inventoryService, times(2)).receiveStock(anyLong(), anyLong(), anyInt(), anyString(), anyString());
    }

    @Test
    @DisplayName("Không nhận hàng với PO DRAFT hoặc CANCELLED")
    void cannotReceiveDraftOrCancelled() {
        PurchaseOrderResponse draft = createDraft();
        PurchaseOrderReceiveRequest req = new PurchaseOrderReceiveRequest(
                List.of(new PurchaseOrderReceiveRequest.Line(itemId(draft, 10L), 1)), null);
        assertThrows(ConflictException.class, () -> service.receive(draft.id(), req));

        service.cancel(draft.id());
        assertThrows(ConflictException.class, () -> service.receive(draft.id(), req));
        verify(inventoryService, never()).receiveStock(anyLong(), anyLong(), anyInt(), anyString(), anyString());
    }

    @Test
    @DisplayName("Dòng không thuộc PO và dòng lặp bị từ chối")
    void rejectsForeignAndDuplicateLines() {
        PurchaseOrderResponse sent = createSent();
        Long item10 = itemId(sent, 10L);

        assertEquals("PO_ITEM_NOT_FOUND", assertThrows(com.smartinventory.exception.NotFoundException.class, () ->
                service.receive(sent.id(), new PurchaseOrderReceiveRequest(
                        List.of(new PurchaseOrderReceiveRequest.Line(999999L, 1)), null))).getCode());

        assertEquals("DUPLICATE_PO_ITEM", assertThrows(BadRequestException.class, () ->
                service.receive(sent.id(), new PurchaseOrderReceiveRequest(List.of(
                        new PurchaseOrderReceiveRequest.Line(item10, 1),
                        new PurchaseOrderReceiveRequest.Line(item10, 1)), null))).getCode());
    }

    @Test
    @DisplayName("Lọc theo trạng thái không hợp lệ trả 400")
    void searchRejectsUnknownStatus() {
        assertThrows(BadRequestException.class, () -> service.search("BOGUS", null, null));
    }
}
