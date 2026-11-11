package com.smartinventory.service;

import com.smartinventory.dto.InventoryAdjustRequest;
import com.smartinventory.model.Category;
import com.smartinventory.model.Inventory;
import com.smartinventory.model.Product;
import com.smartinventory.model.User;
import com.smartinventory.model.Warehouse;
import com.smartinventory.realtime.InventoryChangedEvent;
import com.smartinventory.repository.InventoryRepository;
import com.smartinventory.repository.InventoryTransactionRepository;
import com.smartinventory.repository.ProductRepository;
import com.smartinventory.repository.UserRepository;
import com.smartinventory.repository.WarehouseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Thay đổi tồn kho phát sự kiện để WebSocket gửi cho client. */
class InventoryServiceRealtimeTest {

    private InventoryService service;
    private ApplicationEventPublisher publisher;
    private Inventory inventory;

    @BeforeEach
    void setUp() {
        InventoryRepository inventoryRepository = mock(InventoryRepository.class);
        InventoryTransactionRepository transactionRepository = mock(InventoryTransactionRepository.class);
        ProductRepository productRepository = mock(ProductRepository.class);
        WarehouseRepository warehouseRepository = mock(WarehouseRepository.class);
        UserRepository userRepository = mock(UserRepository.class);

        Category category = new Category();
        ReflectionTestUtils.setField(category, "id", 1L);
        Product product = new Product();
        ReflectionTestUtils.setField(product, "id", 10L);
        product.setSku("SP-1");
        product.setName("Chuột");
        product.setCategory(category);
        product.setMinStockLevel(10);
        product.setMaxStockLevel(100);
        product.setStatus("ACTIVE");
        Warehouse warehouse = new Warehouse();
        ReflectionTestUtils.setField(warehouse, "id", 20L);
        warehouse.setName("Kho A");
        warehouse.setStatus("ACTIVE");
        inventory = new Inventory(product, warehouse, 50, 0, null);
        inventory.setId(100L);

        User actor = new User();
        ReflectionTestUtils.setField(actor, "id", 5L);
        actor.setUsername("tester");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("tester", null, List.of()));
        when(userRepository.findByUsername("tester")).thenReturn(Optional.of(actor));
        when(warehouseRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(warehouse));
        when(inventoryRepository.findByIdWithDetails(100L)).thenReturn(Optional.of(inventory));
        when(inventoryRepository.findByIdWithDetailsForUpdate(100L)).thenReturn(Optional.of(inventory));
        when(transactionRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        service = new InventoryService(inventoryRepository, transactionRepository, productRepository,
                warehouseRepository, userRepository);
        publisher = mock(ApplicationEventPublisher.class);
        ReflectionTestUtils.setField(service, "eventPublisher", publisher);
    }

    @Test
    @DisplayName("Xuất kho đến mức thấp phát sự kiện LOW_STOCK so với trạng thái trước")
    void issuingBelowMinPublishesLowStockEvent() {
        service.adjustStock(100L, new InventoryAdjustRequest("OUT", 42, "xuất", "PX-1"));

        ArgumentCaptor<InventoryChangedEvent> captor = ArgumentCaptor.forClass(InventoryChangedEvent.class);
        verify(publisher).publishEvent(captor.capture());
        InventoryChangedEvent event = captor.getValue();
        assertEquals(8, event.currentStock());
        assertEquals("IN_STOCK", event.previousStatus());
        assertEquals("LOW_STOCK", event.stockStatus());
        assertEquals("ADJUST_OUT", event.changeType());
        assertTrue(event.isNewAlert());
    }

    @Test
    @DisplayName("Thao tác lỗi (xuất quá tồn) không phát sự kiện")
    void failedOperationPublishesNothing() {
        try {
            service.adjustStock(100L, new InventoryAdjustRequest("OUT", 500, "xuất", "PX-2"));
        } catch (RuntimeException expected) {
            // BadRequestException
        }
        verify(publisher, never()).publishEvent(any(Object.class));
    }

    @Test
    @DisplayName("Không có publisher (dựng thủ công) thì vẫn chạy bình thường")
    void worksWithoutPublisher() {
        ReflectionTestUtils.setField(service, "eventPublisher", null);
        service.adjustStock(100L, new InventoryAdjustRequest("IN", 5, "nhập", "PN-1"));
        assertEquals(55, inventory.getCurrentStock());
    }
}
