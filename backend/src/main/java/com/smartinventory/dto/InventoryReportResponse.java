package com.smartinventory.dto;

import java.math.BigDecimal;
import java.util.List;

public record InventoryReportResponse(Summary summary, List<Row> rows) {
    public record Summary(
            long rowCount,
            long totalQuantity,
            long totalReserved,
            long totalAvailable,
            BigDecimal totalValue,
            long lowStockCount,
            long outOfStockCount,
            long overStockCount
    ) {
    }

    public record Row(
            Long inventoryId,
            Long productId,
            String sku,
            String productName,
            String categoryName,
            Long warehouseId,
            String warehouseCode,
            String warehouseName,
            Integer currentStock,
            Integer reservedStock,
            Integer availableStock,
            Integer minStockLevel,
            Integer maxStockLevel,
            BigDecimal unitCost,
            BigDecimal stockValue,
            String status
    ) {
    }
}
