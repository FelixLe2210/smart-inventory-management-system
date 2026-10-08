package com.smartinventory.dto;

import com.smartinventory.model.Inventory;
import com.smartinventory.model.Product;
import com.smartinventory.model.Warehouse;

import java.time.LocalDateTime;

public record InventoryResponse(
        Long id,
        Long productId,
        String productSku,
        String productName,
        String productBarcode,
        String productUnit,
        Integer minStockLevel,
        Integer maxStockLevel,
        Long warehouseId,
        String warehouseCode,
        String warehouseName,
        Integer currentStock,
        Integer reservedStock,
        Integer availableStock,
        String locationInWarehouse,
        String stockStatus,
        LocalDateTime lastStockCountAt,
        LocalDateTime updatedAt
) {
    public static InventoryResponse from(Inventory inventory) {
        if (inventory == null) {
            return null;
        }

        Product product = inventory.getProduct();
        Warehouse warehouse = inventory.getWarehouse();

        return new InventoryResponse(
                inventory.getId(),
                product != null ? product.getId() : null,
                product != null ? product.getSku() : null,
                product != null ? product.getName() : null,
                product != null ? product.getBarcode() : null,
                product != null ? product.getUnit() : null,
                product != null ? product.getMinStockLevel() : null,
                product != null ? product.getMaxStockLevel() : null,
                warehouse != null ? warehouse.getId() : null,
                warehouse != null ? warehouse.getCode() : null,
                warehouse != null ? warehouse.getName() : null,
                inventory.getCurrentStock(),
                inventory.getReservedStock(),
                inventory.getAvailableStock(),
                inventory.getLocationInWarehouse(),
                inventory.getStockStatus(),
                inventory.getLastStockCountAt(),
                inventory.getUpdatedAt()
        );
    }
}
