package com.smartinventory.service;

import com.smartinventory.dto.InventoryAdjustRequest;
import com.smartinventory.dto.InventoryCreateRequest;
import com.smartinventory.dto.InventoryResponse;
import com.smartinventory.dto.InventoryUpdateRequest;
import com.smartinventory.exception.BadRequestException;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.exception.NotFoundException;
import com.smartinventory.model.Category;
import com.smartinventory.model.Inventory;
import com.smartinventory.model.Product;
import com.smartinventory.model.Warehouse;
import com.smartinventory.repository.InventoryRepository;
import com.smartinventory.repository.ProductRepository;
import com.smartinventory.repository.WarehouseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    @Mock
    private InventoryRepository inventoryRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private WarehouseRepository warehouseRepository;

    @InjectMocks
    private InventoryService inventoryService;

    private Product product;
    private Warehouse warehouse;
    private Inventory inventory;

    @BeforeEach
    void setUp() {
        Category category = new Category();
        org.springframework.test.util.ReflectionTestUtils.setField(category, "id", 1L);
        category.setName("Linh kiện điện tử");

        product = new Product();
        org.springframework.test.util.ReflectionTestUtils.setField(product, "id", 10L);
        product.setSku("SP-CPU-I7");
        product.setName("Intel Core i7 14700K");
        product.setBarcode("893000000010");
        product.setUnit("Hộp");
        product.setCategory(category);
        product.setMinStockLevel(10);
        product.setMaxStockLevel(100);
        product.setStatus("ACTIVE");

        warehouse = new Warehouse();
        org.springframework.test.util.ReflectionTestUtils.setField(warehouse, "id", 20L);
        warehouse.setCode("KHO-SGN01");
        warehouse.setName("Kho Tổng Sài Gòn");
        warehouse.setStatus("ACTIVE");

        inventory = new Inventory(product, warehouse, 50, 10, "Kệ A1-02");
        inventory.setId(100L);
    }

    @Test
    @DisplayName("Tạo tồn kho thành công khi dữ liệu hợp lệ")
    void createInventory_Success() {
        InventoryCreateRequest request = new InventoryCreateRequest(10L, 20L, 50, 10, "Kệ A1-02");

        when(productRepository.findById(10L)).thenReturn(Optional.of(product));
        when(warehouseRepository.findById(20L)).thenReturn(Optional.of(warehouse));
        when(inventoryRepository.existsByProductIdAndWarehouseId(10L, 20L)).thenReturn(false);
        when(inventoryRepository.save(any(Inventory.class))).thenAnswer(invocation -> {
            Inventory inv = invocation.getArgument(0);
            inv.setId(100L);
            return inv;
        });

        InventoryResponse response = inventoryService.createInventory(request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(100L);
        assertThat(response.currentStock()).isEqualTo(50);
        assertThat(response.reservedStock()).isEqualTo(10);
        assertThat(response.availableStock()).isEqualTo(40);
        assertThat(response.stockStatus()).isEqualTo("IN_STOCK");
    }

    @Test
    @DisplayName("Tạo tồn kho thất bại khi sản phẩm không tồn tại")
    void createInventory_ProductNotFound() {
        InventoryCreateRequest request = new InventoryCreateRequest(999L, 20L, 10, 0, "A1");
        when(productRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> inventoryService.createInventory(request))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Không tìm thấy sản phẩm");
    }

    @Test
    @DisplayName("Tạo tồn kho thất bại khi kho không hoạt động (MAINTENANCE)")
    void createInventory_WarehouseNotActive() {
        warehouse.setStatus("MAINTENANCE");
        InventoryCreateRequest request = new InventoryCreateRequest(10L, 20L, 10, 0, "A1");

        when(productRepository.findById(10L)).thenReturn(Optional.of(product));
        when(warehouseRepository.findById(20L)).thenReturn(Optional.of(warehouse));

        assertThatThrownBy(() -> inventoryService.createInventory(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("không thể thực hiện giao dịch tồn kho");
    }

    @Test
    @DisplayName("Tạo tồn kho thất bại khi cặp (product, warehouse) đã tồn tại")
    void createInventory_ConflictDuplicate() {
        InventoryCreateRequest request = new InventoryCreateRequest(10L, 20L, 10, 0, "A1");

        when(productRepository.findById(10L)).thenReturn(Optional.of(product));
        when(warehouseRepository.findById(20L)).thenReturn(Optional.of(warehouse));
        when(inventoryRepository.existsByProductIdAndWarehouseId(10L, 20L)).thenReturn(true);

        assertThatThrownBy(() -> inventoryService.createInventory(request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("đã được thiết lập tồn kho");
    }

    @Test
    @DisplayName("Tạo tồn kho thất bại khi số lượng giữ chỗ lớn hơn số lượng tồn kho")
    void createInventory_ReservedGreaterThanCurrent() {
        InventoryCreateRequest request = new InventoryCreateRequest(10L, 20L, 10, 20, "A1");

        when(productRepository.findById(10L)).thenReturn(Optional.of(product));
        when(warehouseRepository.findById(20L)).thenReturn(Optional.of(warehouse));
        when(inventoryRepository.existsByProductIdAndWarehouseId(10L, 20L)).thenReturn(false);

        assertThatThrownBy(() -> inventoryService.createInventory(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("không được vượt quá số lượng tồn kho ban đầu");
    }

    @Test
    @DisplayName("Điều chỉnh IN: Nhập hàng tăng tồn kho thành công")
    void adjustStock_In_Success() {
        when(inventoryRepository.findByIdWithDetails(100L)).thenReturn(Optional.of(inventory));
        InventoryAdjustRequest request = new InventoryAdjustRequest("IN", 20, "Nhập thêm hàng", "PNK-001");

        InventoryResponse response = inventoryService.adjustStock(100L, request);

        assertThat(response.currentStock()).isEqualTo(70);
        assertThat(response.availableStock()).isEqualTo(60);
    }

    @Test
    @DisplayName("Điều chỉnh OUT: Xuất kho thành công khi đủ số lượng khả dụng")
    void adjustStock_Out_Success() {
        when(inventoryRepository.findByIdWithDetails(100L)).thenReturn(Optional.of(inventory));
        InventoryAdjustRequest request = new InventoryAdjustRequest("OUT", 15, "Xuất bán hàng", "PXK-001");

        InventoryResponse response = inventoryService.adjustStock(100L, request);

        assertThat(response.currentStock()).isEqualTo(35);
        assertThat(response.availableStock()).isEqualTo(25);
    }

    @Test
    @DisplayName("Stock Validation: Xuất kho vượt quá tồn khả dụng bị chặn (chống âm kho)")
    void adjustStock_Out_InsufficientStock_ThrowsBadRequest() {
        when(inventoryRepository.findByIdWithDetails(100L)).thenReturn(Optional.of(inventory));
        // Hiện tại: current=50, reserved=10 => available=40. Yêu cầu xuất 45 -> lỗi
        InventoryAdjustRequest request = new InventoryAdjustRequest("OUT", 45, "Xuất quá lượng", "PXK-002");

        assertThatThrownBy(() -> inventoryService.adjustStock(100L, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Không đủ tồn kho khả dụng để xuất");
    }

    @Test
    @DisplayName("Điều chỉnh SET: Kiểm kê đặt lại tồn kho")
    void adjustStock_Set_Success() {
        when(inventoryRepository.findByIdWithDetails(100L)).thenReturn(Optional.of(inventory));
        InventoryAdjustRequest request = new InventoryAdjustRequest("SET", 60, "Kiểm kê định kỳ", "KK-001");

        InventoryResponse response = inventoryService.adjustStock(100L, request);

        assertThat(response.currentStock()).isEqualTo(60);
        assertThat(response.availableStock()).isEqualTo(50);
    }

    @Test
    @DisplayName("Stock Validation: SET tồn kho nhỏ hơn reservedStock bị chặn")
    void adjustStock_Set_SmallerThanReserved_ThrowsBadRequest() {
        when(inventoryRepository.findByIdWithDetails(100L)).thenReturn(Optional.of(inventory));
        // reserved=10, set xuống 5 -> lỗi
        InventoryAdjustRequest request = new InventoryAdjustRequest("SET", 5, "Kiểm kê âm", "KK-002");

        assertThatThrownBy(() -> inventoryService.adjustStock(100L, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("không thể nhỏ hơn số lượng hàng đang được giữ chỗ");
    }

    @Test
    @DisplayName("Điều chỉnh RESERVE: Giữ chỗ thành công")
    void adjustStock_Reserve_Success() {
        when(inventoryRepository.findByIdWithDetails(100L)).thenReturn(Optional.of(inventory));
        // available=40, reserve thêm 15 -> reserved=25, available=25
        InventoryAdjustRequest request = new InventoryAdjustRequest("RESERVE", 15, "Giữ đơn hàng", "DH-001");

        InventoryResponse response = inventoryService.adjustStock(100L, request);

        assertThat(response.reservedStock()).isEqualTo(25);
        assertThat(response.availableStock()).isEqualTo(25);
    }

    @Test
    @DisplayName("Stock Validation: RESERVE vượt quá khả dụng bị chặn")
    void adjustStock_Reserve_InsufficientAvailable_ThrowsBadRequest() {
        when(inventoryRepository.findByIdWithDetails(100L)).thenReturn(Optional.of(inventory));
        // available=40, reserve 41 -> lỗi
        InventoryAdjustRequest request = new InventoryAdjustRequest("RESERVE", 41, "Giữ quá lượng", "DH-002");

        assertThatThrownBy(() -> inventoryService.adjustStock(100L, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Số lượng tồn kho khả dụng không đủ để giữ chỗ");
    }

    @Test
    @DisplayName("Điều chỉnh RELEASE: Giải phóng giữ chỗ thành công")
    void adjustStock_Release_Success() {
        when(inventoryRepository.findByIdWithDetails(100L)).thenReturn(Optional.of(inventory));
        // reserved=10, release 5 -> reserved=5
        InventoryAdjustRequest request = new InventoryAdjustRequest("RELEASE", 5, "Hủy đơn hàng", "HDH-001");

        InventoryResponse response = inventoryService.adjustStock(100L, request);

        assertThat(response.reservedStock()).isEqualTo(5);
        assertThat(response.availableStock()).isEqualTo(45);
    }

    @Test
    @DisplayName("Stock Validation: Không cho phép điều chỉnh khi kho INACTIVE")
    void adjustStock_WarehouseInactive_ThrowsBadRequest() {
        warehouse.setStatus("INACTIVE");
        when(inventoryRepository.findByIdWithDetails(100L)).thenReturn(Optional.of(inventory));
        InventoryAdjustRequest request = new InventoryAdjustRequest("IN", 10, "Nhập kho", "PNK-002");

        assertThatThrownBy(() -> inventoryService.adjustStock(100L, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("không thể thực hiện giao dịch tồn kho");
    }

    @Test
    @DisplayName("Cập nhật vị trí lưu kho thành công")
    void updateInventory_Success() {
        when(inventoryRepository.findByIdWithDetails(100L)).thenReturn(Optional.of(inventory));
        InventoryUpdateRequest request = new InventoryUpdateRequest("Kệ C2-05", LocalDateTime.now());

        InventoryResponse response = inventoryService.updateInventory(100L, request);

        assertThat(response.locationInWarehouse()).isEqualTo("Kệ C2-05");
    }
}
