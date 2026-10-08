package com.smartinventory.dto;

import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public record InventoryUpdateRequest(
        @Size(max = 50, message = "Vị trí trong kho tối đa 50 ký tự")
        String locationInWarehouse,

        LocalDateTime lastStockCountAt
) {
}
