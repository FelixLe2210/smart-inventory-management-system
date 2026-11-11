package com.smartinventory.realtime;

import com.smartinventory.model.Inventory;
import com.smartinventory.model.Product;
import com.smartinventory.model.Warehouse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class InventoryChangedEventTest {

    private InventoryChangedEvent event(int previous, int current) {
        Product product = new Product();
        product.setSku("SKU-1");
        product.setName("Chuột");
        product.setMinStockLevel(10);
        product.setMaxStockLevel(100);
        Warehouse warehouse = new Warehouse();
        warehouse.setName("Kho A");
        Inventory inventory = new Inventory(product, warehouse, current, 3, null);
        return InventoryChangedEvent.of(inventory, previous, "TEST");
    }

    @Test
    @DisplayName("Từ IN_STOCK xuống LOW_STOCK là cảnh báo mới")
    void inStockToLowIsNewAlert() {
        InventoryChangedEvent e = event(50, 8);
        assertEquals("IN_STOCK", e.previousStatus());
        assertEquals("LOW_STOCK", e.stockStatus());
        assertEquals(5, e.availableStock());
        assertTrue(e.isNewAlert());
    }

    @Test
    @DisplayName("Đang LOW_STOCK mà vẫn LOW_STOCK thì không báo lặp")
    void staysLowIsNotNewAlert() {
        assertFalse(event(8, 5).isNewAlert());
    }

    @Test
    @DisplayName("Từ LOW_STOCK xuống OUT_OF_STOCK là cảnh báo mới (mức nặng hơn)")
    void lowToOutIsNewAlert() {
        assertTrue(event(5, 0).isNewAlert());
    }

    @Test
    @DisplayName("Nhập hàng làm tồn tăng lại mức bình thường thì không cảnh báo")
    void recoveryIsNotAlert() {
        assertFalse(event(5, 60).isNewAlert());
    }
}
