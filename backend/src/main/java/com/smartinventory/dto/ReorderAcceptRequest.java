package com.smartinventory.dto;

import jakarta.validation.constraints.Positive;

/** {@code quantity} bỏ trống = dùng đúng số lượng AI đề xuất. */
public record ReorderAcceptRequest(
        @Positive(message = "Số lượng phải lớn hơn 0")
        Integer quantity
) {
}
