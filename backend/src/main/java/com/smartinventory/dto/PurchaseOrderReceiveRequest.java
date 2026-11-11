package com.smartinventory.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

public record PurchaseOrderReceiveRequest(
        @NotEmpty(message = "Phải có ít nhất một dòng nhận hàng")
        @Valid
        List<Line> lines,

        @Size(max = 200, message = "Ghi chú tối đa 200 ký tự")
        String note
) {
    public record Line(
            @NotNull(message = "itemId không được để trống")
            Long itemId,

            @NotNull(message = "quantity không được để trống")
            @Positive(message = "Số lượng nhận phải lớn hơn 0")
            Integer quantity
    ) {
    }
}
