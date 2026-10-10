package com.smartinventory.service;

import com.smartinventory.dto.WarehouseRequest;
import com.smartinventory.dto.WarehouseResponse;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.model.Warehouse;
import com.smartinventory.repository.InventoryRepository;
import com.smartinventory.repository.WarehouseRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WarehouseServiceTest {

    @Mock
    private WarehouseRepository warehouseRepository;

    @Mock
    private InventoryRepository inventoryRepository;

    @InjectMocks
    private WarehouseService warehouseService;

    @Test
    void deleteWarehouseIsBlockedWhenInventoryExists() {
        when(warehouseRepository.existsById(1L)).thenReturn(true);
        when(inventoryRepository.existsByWarehouseId(1L)).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class, () -> warehouseService.deleteWarehouse(1L));

        assertEquals("WAREHOUSE_HAS_INVENTORY", ex.getCode());
        verify(warehouseRepository, never()).deleteById(any());
    }

    @Test
    void deleteWarehouseSucceedsWhenNoInventory() {
        when(warehouseRepository.existsById(1L)).thenReturn(true);
        when(inventoryRepository.existsByWarehouseId(1L)).thenReturn(false);

        warehouseService.deleteWarehouse(1L);

        verify(warehouseRepository).deleteById(1L);
    }

    @Test
    void createWarehousePersistsAndReturnsExtendedWarehouseDetails() {
        WarehouseRequest request = new WarehouseRequest();
        request.setCode("KHO-HAN01");
        request.setName("Kho Hà Nội");
        request.setAddress("KCN Quang Minh, Hà Nội");
        request.setDescription("Hub miền Bắc");
        request.setRegion("north");
        request.setType("fulfillment");
        request.setArea(new BigDecimal("8500.50"));
        request.setCapacity(7000);
        request.setHeight(new BigDecimal("12.50"));
        request.setDocks(14);
        request.setFloorLoad(new BigDecimal("5.00"));
        request.setManagerName("Nguyễn An");
        request.setManagerEmail("an@example.com");
        request.setPhone("0900000000");
        request.setSecurity("Đội an ninh A");
        request.setBarcodeEnabled(false);

        when(warehouseRepository.existsByCode("KHO-HAN01")).thenReturn(false);
        when(warehouseRepository.save(any(Warehouse.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WarehouseResponse response = warehouseService.createWarehouse(request);

        ArgumentCaptor<Warehouse> warehouseCaptor = ArgumentCaptor.forClass(Warehouse.class);
        verify(warehouseRepository).save(warehouseCaptor.capture());
        Warehouse saved = warehouseCaptor.getValue();
        assertEquals("Hub miền Bắc", saved.getDescription());
        assertEquals("north", saved.getRegion());
        assertEquals("fulfillment", saved.getType());
        assertEquals(new BigDecimal("8500.50"), saved.getArea());
        assertEquals(7000, saved.getCapacity());
        assertEquals(new BigDecimal("12.50"), saved.getHeight());
        assertEquals(14, saved.getDocks());
        assertEquals(new BigDecimal("5.00"), saved.getFloorLoad());
        assertEquals("Nguyễn An", saved.getManagerName());
        assertEquals("an@example.com", saved.getManagerEmail());
        assertEquals("Đội an ninh A", saved.getSecurity());
        assertEquals("0900000000", saved.getPhone());
        assertEquals(false, saved.isBarcodeEnabled());

        assertEquals(new BigDecimal("8500.50"), response.getArea());
        assertEquals("Nguyễn An", response.getManagerName());
        assertEquals(false, response.isBarcodeEnabled());
    }
}
