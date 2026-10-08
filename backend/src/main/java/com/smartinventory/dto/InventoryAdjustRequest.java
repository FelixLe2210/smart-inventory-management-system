package com.smartinventory.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record InventoryAdjustRequest(
        @NotBlank(message = "Loại điều chỉnh (adjustmentType) không được để trống")
        @Pattern(regexp = "^(?i)(IN|OUT|SET|RESERVE|RELEASE)$", message = "adjustmentType phải là một trong các giá trị: IN, OUT, SET, RESERVE, RELEASE")
        String adjustmentType,

        @NotNull(message = "Số lượng (quantity) không được để trống")
        @Min(value = 0, message = "Số lượng (quantity) không được nhỏ hơn 0")
        Integer quantity,

        @Size(max = 255, message = "Lý do tối đa 255 ký tự")
        String reason,

        @Size(max = 50, message = "Mã chứng từ tham chiếu tối đa 50 ký tự")
        String referenceDoc
) {
}
