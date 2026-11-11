package com.smartinventory.dto;

import jakarta.validation.constraints.NotNull;

/** Yêu cầu bật hoặc khóa một tài khoản. */
public record UserStatusRequest(
        @NotNull(message = "Trạng thái không được để trống")
        Boolean active
) {
}
