package com.smartinventory.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** Sprint4-13/16: quy tắc trạng thái tồn kho In Stock / Low / Out (và Over Stock) theo Min/Max của Product. */
class InventoryStockStatusTest {

    private Inventory inv(int current, int min, int max) {
        Product p = new Product();
        p.setMinStockLevel(min);
        p.setMaxStockLevel(max);
        return new Inventory(p, new Warehouse(), current, 0, null);
    }

    @Test
    @DisplayName("Tồn <= 0 là OUT_OF_STOCK")
    void out() {
        assertEquals("OUT_OF_STOCK", inv(0, 10, 100).getStockStatus());
    }

    @Test
    @DisplayName("0 < tồn <= Min là LOW_STOCK (biên Min tính là Low)")
    void low() {
        assertEquals("LOW_STOCK", inv(1, 10, 100).getStockStatus());
        assertEquals("LOW_STOCK", inv(10, 10, 100).getStockStatus());
    }

    @Test
    @DisplayName("Min < tồn <= Max là IN_STOCK (biên Max vẫn là In Stock)")
    void in() {
        assertEquals("IN_STOCK", inv(11, 10, 100).getStockStatus());
        assertEquals("IN_STOCK", inv(100, 10, 100).getStockStatus());
    }

    @Test
    @DisplayName("Tồn > Max là OVER_STOCK")
    void over() {
        assertEquals("OVER_STOCK", inv(101, 10, 100).getStockStatus());
    }

    @Test
    @DisplayName("Tồn khả dụng = tồn hiện tại - giữ chỗ, không âm")
    void available() {
        Inventory i = inv(50, 10, 100);
        i.setReservedStock(20);
        assertEquals(30, i.getAvailableStock());
    }
}
