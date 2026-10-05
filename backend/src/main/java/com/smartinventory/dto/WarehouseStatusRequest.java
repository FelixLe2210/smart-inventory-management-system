package com.smartinventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record WarehouseStatusRequest(
        @NotBlank(message = "Trạng thái không được để trống")
        @Pattern(
                regexp = "^(ACTIVE|INACTIVE|MAINTENANCE)$",
                message = "Trạng thái phải là ACTIVE, INACTIVE hoặc MAINTENANCE"
        )
        String status
) {
}
