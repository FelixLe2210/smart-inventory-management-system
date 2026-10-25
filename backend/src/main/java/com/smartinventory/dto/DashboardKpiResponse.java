package com.smartinventory.dto;

import java.math.BigDecimal;

public record DashboardKpiResponse(
        long totalProducts,
        long totalStockQuantity,
        long totalReservedQuantity,
        long totalAvailableQuantity,
        BigDecimal totalInventoryValue,
        long lowStockCount,
        long outOfStockCount,
        long totalWarehouses,
        long activeWarehouses
) {
}
