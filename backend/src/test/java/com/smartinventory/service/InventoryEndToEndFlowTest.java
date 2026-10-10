package com.smartinventory.service;

import com.smartinventory.dto.*;
import com.smartinventory.exception.BadRequestException;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.model.Category;
import com.smartinventory.model.Inventory;
import com.smartinventory.model.Product;
import com.smartinventory.model.Warehouse;
import com.smartinventory.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/**
 * Sprint4-16: kiểm thử end-to-end luồng Product -> Warehouse -> Inventory.
 *
 * Dùng 3 service thật (Product, Warehouse, Inventory) nối với repository giả lập lưu trong bộ nhớ,
 * nên kiểm được ràng buộc xuyên module mà không cần SQL Server.
 * (Chạy với DB thật: docs/api/inventory-e2e.mjs, xem docs/api/INVENTORY_TESTING.md)
 */
class InventoryEndToEndFlowTest {

    private final AtomicLong ids = new AtomicLong(0);
    private final Map<Long, Product> products = new HashMap<>();
    private final Map<Long, Warehouse> warehouses = new HashMap<>();
    private final Map<Long, Inventory> inventories = new HashMap<>();

    private ProductService productService;
    private WarehouseService warehouseService;
    private InventoryService inventoryService;

    @BeforeEach
    void setUp() {
        ProductRepository productRepo = mock(ProductRepository.class);
        WarehouseRepository warehouseRepo = mock(WarehouseRepository.class);
        InventoryRepository inventoryRepo = mock(InventoryRepository.class);
        CategoryRepository categoryRepo = mock(CategoryRepository.class);
        SupplierRepository supplierRepo = mock(SupplierRepository.class);

        Category category = new Category();
        ReflectionTestUtils.setField(category, "id", 1L);
        category.setName("Điện tử");
        when(categoryRepo.findById(1L)).thenReturn(Optional.of(category));

        // Product
        when(productRepo.save(any(Product.class))).thenAnswer(i -> store(products, i.getArgument(0)));
        when(productRepo.findById(anyLong())).thenAnswer(i -> Optional.ofNullable(products.get(i.<Long>getArgument(0))));
        when(productRepo.existsById(anyLong())).thenAnswer(i -> products.containsKey(i.<Long>getArgument(0)));
        when(productRepo.existsBySku(any())).thenReturn(false);
        when(productRepo.existsByBarcode(any())).thenReturn(false);
        when(productRepo.existsBySkuAndIdNot(any(), anyLong())).thenReturn(false);
        when(productRepo.existsByBarcodeAndIdNot(any(), anyLong())).thenReturn(false);
        // Mô phỏng ON DELETE CASCADE của FK inventories.product_id
        doAnswer(i -> {
            Long id = i.getArgument(0);
            inventories.values().removeIf(v -> v.getProduct().getId().equals(id));
            return products.remove(id);
        }).when(productRepo).deleteById(anyLong());

        // Warehouse
        when(warehouseRepo.save(any(Warehouse.class))).thenAnswer(i -> store(warehouses, i.getArgument(0)));
        when(warehouseRepo.findById(anyLong())).thenAnswer(i -> Optional.ofNullable(warehouses.get(i.<Long>getArgument(0))));
        when(warehouseRepo.existsById(anyLong())).thenAnswer(i -> warehouses.containsKey(i.<Long>getArgument(0)));
        when(warehouseRepo.existsByCode(any())).thenReturn(false);
        doAnswer(i -> warehouses.remove(i.<Long>getArgument(0))).when(warehouseRepo).deleteById(anyLong());

        // Inventory (mô phỏng các truy vấn theo khóa ngoại)
        when(inventoryRepo.save(any(Inventory.class))).thenAnswer(i -> store(inventories, i.getArgument(0)));
        when(inventoryRepo.findByIdWithDetails(anyLong())).thenAnswer(i -> Optional.ofNullable(inventories.get(i.<Long>getArgument(0))));
        when(inventoryRepo.findAllWithDetails()).thenAnswer(i -> new ArrayList<>(inventories.values()));
        when(inventoryRepo.findByProductId(anyLong())).thenAnswer(i ->
                inventories.values().stream().filter(v -> v.getProduct().getId().equals(i.<Long>getArgument(0))).toList());
        when(inventoryRepo.findByWarehouseId(anyLong())).thenAnswer(i ->
                inventories.values().stream().filter(v -> v.getWarehouse().getId().equals(i.<Long>getArgument(0))).toList());
        when(inventoryRepo.findByProductIdAndWarehouseId(anyLong(), anyLong())).thenAnswer(i ->
                inventories.values().stream().filter(v ->
                        v.getProduct().getId().equals(i.<Long>getArgument(0))
                                && v.getWarehouse().getId().equals(i.<Long>getArgument(1))).findFirst());
        when(inventoryRepo.existsByProductIdAndWarehouseId(anyLong(), anyLong())).thenAnswer(i ->
                inventories.values().stream().anyMatch(v ->
                        v.getProduct().getId().equals(i.<Long>getArgument(0))
                                && v.getWarehouse().getId().equals(i.<Long>getArgument(1))));
        when(inventoryRepo.existsByWarehouseId(anyLong())).thenAnswer(i ->
                inventories.values().stream().anyMatch(v -> v.getWarehouse().getId().equals(i.<Long>getArgument(0))));
        when(inventoryRepo.existsByProductIdAndCurrentStockGreaterThan(anyLong(), any())).thenAnswer(i ->
                inventories.values().stream().anyMatch(v ->
                        v.getProduct().getId().equals(i.<Long>getArgument(0))
                                && v.getCurrentStock() > i.<Integer>getArgument(1)));

        productService = new ProductService(productRepo, categoryRepo, supplierRepo, inventoryRepo);
        warehouseService = new WarehouseService(warehouseRepo, inventoryRepo);
        inventoryService = new InventoryService(inventoryRepo, productRepo, warehouseRepo);
    }

    private <T> T store(Map<Long, T> map, T entity) {
        Long id = (Long) ReflectionTestUtils.getField(entity, "id");
        if (id == null) {
            id = ids.incrementAndGet();
            ReflectionTestUtils.setField(entity, "id", id);
        }
        map.put(id, entity);
        return entity;
    }

    private ProductRequest productRequest(String sku, int min, int max) {
        ProductRequest r = new ProductRequest();
        r.setSku(sku);
        r.setBarcode("893" + Math.abs(sku.hashCode()));
        r.setName("Sản phẩm " + sku);
        r.setCategoryId(1L);
        r.setUnit("Cái");
        r.setPurchasePrice(new BigDecimal("1000"));
        r.setSellingPrice(new BigDecimal("1500"));
        r.setMinStockLevel(min);
        r.setMaxStockLevel(max);
        r.setStatus("ACTIVE");
        return r;
    }

    private WarehouseRequest warehouseRequest(String code) {
        WarehouseRequest r = new WarehouseRequest();
        r.setCode(code);
        r.setName("Kho " + code);
        r.setAddress("KCN Test");
        r.setRegion("south");
        r.setType("standard");
        return r;
    }

    private InventoryCreateRequest create(Long productId, Long warehouseId, int stock, int reserved) {
        return new InventoryCreateRequest(productId, warehouseId, stock, reserved, "A1-01");
    }

    private InventoryResponse adjust(Long invId, String type, int qty) {
        return inventoryService.adjustStock(invId, new InventoryAdjustRequest(type, qty, "E2E", "DOC-1"));
    }

    @Test
    @DisplayName("E2E: Product + Warehouse -> khai báo Inventory -> trạng thái In/Low/Out/Over đổi theo tồn và theo Min/Max của Product")
    void productToWarehouseToInventoryFlow() {
        Long productId = productService.createProduct(productRequest("PRD-E2E", 10, 100)).getId();
        Long warehouseId = warehouseService.createWarehouse(warehouseRequest("KHO-E2E")).getId();

        InventoryResponse created = inventoryService.createInventory(create(productId, warehouseId, 50, 0));
        assertEquals("IN_STOCK", created.stockStatus());
        assertEquals("PRD-E2E", created.productSku());
        assertEquals("KHO-E2E", created.warehouseCode());
        Long invId = created.id();

        assertEquals("LOW_STOCK", adjust(invId, "OUT", 40).stockStatus());       // 10 (= Min)
        assertEquals("OUT_OF_STOCK", adjust(invId, "OUT", 10).stockStatus());    // 0
        assertEquals("OVER_STOCK", adjust(invId, "IN", 150).stockStatus());      // 150 > Max 100
        assertEquals("IN_STOCK", adjust(invId, "SET", 50).stockStatus());

        // Đổi Min ở Master Data -> trạng thái tồn kho đổi theo, không cần sửa Inventory
        productService.updateProduct(productId, productRequest("PRD-E2E", 60, 100));
        assertEquals("LOW_STOCK", inventoryService.getInventoryById(invId).stockStatus());

        // Truy vấn theo kho / sản phẩm
        assertEquals(1, inventoryService.getAllInventories(productId, warehouseId, null).size());
        assertEquals(1, inventoryService.getAllInventories(null, warehouseId, null).size());
        assertEquals(1, inventoryService.getAllInventories(productId, null, null).size());
        assertEquals(invId, inventoryService.getInventoryByProductAndWarehouse(productId, warehouseId).id());
    }

    @Test
    @DisplayName("E2E: giữ chỗ / xuất kho tôn trọng tồn khả dụng")
    void reservationRules() {
        Long productId = productService.createProduct(productRequest("PRD-RSV", 5, 100)).getId();
        Long warehouseId = warehouseService.createWarehouse(warehouseRequest("KHO-RSV")).getId();
        Long invId = inventoryService.createInventory(create(productId, warehouseId, 50, 0)).id();

        InventoryResponse r = adjust(invId, "RESERVE", 20);
        assertEquals(30, r.availableStock());

        BadRequestException out = assertThrows(BadRequestException.class, () -> adjust(invId, "OUT", 40));
        assertEquals("INSUFFICIENT_STOCK", out.getCode());

        BadRequestException set = assertThrows(BadRequestException.class, () -> adjust(invId, "SET", 10));
        assertEquals("INVALID_STOCK", set.getCode());

        assertEquals(50, adjust(invId, "RELEASE", 20).availableStock());
    }

    @Test
    @DisplayName("E2E: ràng buộc xóa Master Data khi đã có tồn kho")
    void masterDataDeleteGuards() {
        Long productId = productService.createProduct(productRequest("PRD-DEL", 5, 100)).getId();
        Long warehouseId = warehouseService.createWarehouse(warehouseRequest("KHO-DEL")).getId();
        Long invId = inventoryService.createInventory(create(productId, warehouseId, 20, 0)).id();

        assertEquals("WAREHOUSE_HAS_INVENTORY",
                assertThrows(ConflictException.class, () -> warehouseService.deleteWarehouse(warehouseId)).getCode());
        assertEquals("PRODUCT_HAS_STOCK",
                assertThrows(ConflictException.class, () -> productService.deleteProduct(productId)).getCode());

        // Đưa tồn về 0 -> xóa được sản phẩm (bản ghi tồn cascade theo FK) -> sau đó xóa được kho
        adjust(invId, "SET", 0);
        productService.deleteProduct(productId);
        assertTrue(inventories.isEmpty());
        warehouseService.deleteWarehouse(warehouseId);
        assertTrue(products.isEmpty());
        assertTrue(warehouses.isEmpty());
    }

    @Test
    @DisplayName("E2E: không nhập/điều chỉnh tồn cho kho bảo trì, và không trùng cặp Product-Warehouse")
    void inventoryRulesAgainstMasterData() {
        Long productId = productService.createProduct(productRequest("PRD-RULE", 5, 100)).getId();
        Long product2 = productService.createProduct(productRequest("PRD-RULE2", 5, 100)).getId();
        Long warehouseId = warehouseService.createWarehouse(warehouseRequest("KHO-RULE")).getId();

        Long invId = inventoryService.createInventory(create(productId, warehouseId, 5, 0)).id();

        assertEquals("INVENTORY_EXISTS", assertThrows(ConflictException.class,
                () -> inventoryService.createInventory(create(productId, warehouseId, 1, 0))).getCode());

        warehouseService.updateStatus(warehouseId, "MAINTENANCE");
        assertEquals("WAREHOUSE_NOT_ACTIVE", assertThrows(BadRequestException.class,
                () -> inventoryService.createInventory(create(product2, warehouseId, 1, 0))).getCode());
        assertEquals("WAREHOUSE_NOT_ACTIVE", assertThrows(BadRequestException.class,
                () -> adjust(invId, "IN", 1)).getCode());
    }
}
