package com.smartinventory.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record PurchaseOrderRequest(
        @NotNull(message = "supplierId không được để trống")
        Long supplierId,

        @NotNull(message = "destinationWarehouseId không được để trống")
        Long destinationWarehouseId,

        LocalDate expectedDeliveryDate,

        @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự")
        String note,

        @NotEmpty(message = "Đơn đặt hàng phải có ít nhất một sản phẩm")
        @Valid
        List<Item> items
) {
    public record Item(
            @NotNull(message = "productId không được để trống")
            Long productId,

            @NotNull(message = "orderedQty không được để trống")
            @Positive(message = "Số lượng đặt phải lớn hơn 0")
            Integer orderedQty,

            /** Bỏ trống thì lấy giá nhập của sản phẩm. */
            @PositiveOrZero(message = "Đơn giá không được âm")
            BigDecimal unitPrice
    ) {
    }
}
