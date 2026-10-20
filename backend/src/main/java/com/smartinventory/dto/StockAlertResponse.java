package com.smartinventory.dto;

import java.util.List;

public record StockAlertResponse(
        Long productId,
        String productSku,
        String productName,
        String type,
        long availableStock,
        int minStockLevel,
        long shortage,
        List<WarehouseAvailability> warehouses
) {
    public record WarehouseAvailability(Long warehouseId, String code, String name, long available) {
    }
}
