package com.smartinventory.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record InventoryCreateRequest(
        @NotNull(message = "productId không được để trống")
        Long productId,

        @NotNull(message = "warehouseId không được để trống")
        Long warehouseId,

        @Min(value = 0, message = "Số lượng tồn kho ban đầu (initialStock) không được nhỏ hơn 0")
        Integer initialStock,

        @Min(value = 0, message = "Số lượng giữ chỗ (reservedStock) không được nhỏ hơn 0")
        Integer reservedStock,

        @Size(max = 50, message = "Vị trí trong kho tối đa 50 ký tự")
        String locationInWarehouse
) {
    public InventoryCreateRequest {
        if (initialStock == null) {
            initialStock = 0;
        }
        if (reservedStock == null) {
            reservedStock = 0;
        }
    }
}
