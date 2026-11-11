package com.smartinventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Yêu cầu đổi vai trò của một tài khoản. */
public record UserRoleRequest(
        @NotBlank(message = "Vai trò không được để trống")
        @Pattern(
                regexp = "^(ADMIN|MANAGER|STAFF|VIEWER)$",
                message = "Vai trò phải là ADMIN, MANAGER, STAFF hoặc VIEWER"
        )
        String role
) {
}
