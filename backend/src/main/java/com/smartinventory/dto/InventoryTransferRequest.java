package com.smartinventory.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record InventoryTransferRequest(
        @NotNull(message = "destinationWarehouseId không được để trống")
        Long destinationWarehouseId,

        @NotNull(message = "quantity không được để trống")
        @Positive(message = "Số lượng chuyển kho phải lớn hơn 0")
        Integer quantity,

        @Size(max = 255, message = "Lý do tối đa 255 ký tự")
        String reason,

        @Size(max = 50, message = "Mã chứng từ tham chiếu tối đa 50 ký tự")
        String referenceDoc
) {
}
