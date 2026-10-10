package com.smartinventory.service;

import com.smartinventory.exception.ConflictException;
import com.smartinventory.exception.NotFoundException;
import com.smartinventory.repository.CategoryRepository;
import com.smartinventory.repository.InventoryRepository;
import com.smartinventory.repository.ProductRepository;
import com.smartinventory.repository.SupplierRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

/** Sprint4-15: ràng buộc xóa sản phẩm khi còn tồn kho. */
@ExtendWith(MockitoExtension.class)
class ProductServiceDeleteTest {

    @Mock private ProductRepository productRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private SupplierRepository supplierRepository;
    @Mock private InventoryRepository inventoryRepository;
    @InjectMocks private ProductService productService;

    @Test
    @DisplayName("Không xóa được sản phẩm còn hàng tồn kho (409 PRODUCT_HAS_STOCK)")
    void blockedWhenStockRemains() {
        when(productRepository.existsById(1L)).thenReturn(true);
        when(inventoryRepository.existsByProductIdAndCurrentStockGreaterThan(1L, 0)).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class, () -> productService.deleteProduct(1L));

        assertEquals("PRODUCT_HAS_STOCK", ex.getCode());
        verify(productRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("Xóa được sản phẩm khi không còn hàng tồn")
    void allowedWhenNoStock() {
        when(productRepository.existsById(1L)).thenReturn(true);
        when(inventoryRepository.existsByProductIdAndCurrentStockGreaterThan(1L, 0)).thenReturn(false);

        productService.deleteProduct(1L);

        verify(productRepository).deleteById(1L);
    }

    @Test
    @DisplayName("404 khi sản phẩm không tồn tại")
    void notFound() {
        when(productRepository.existsById(9L)).thenReturn(false);
        assertThrows(NotFoundException.class, () -> productService.deleteProduct(9L));
    }
}
