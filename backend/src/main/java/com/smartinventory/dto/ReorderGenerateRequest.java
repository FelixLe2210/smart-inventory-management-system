package com.smartinventory.dto;

import jakarta.validation.constraints.Positive;

/** Cả hai trường đều tùy chọn: bỏ trống = tính cho mọi tồn kho đang hoạt động. */
public record ReorderGenerateRequest(
        @Positive Long productId,
        @Positive Long warehouseId
) {
}
