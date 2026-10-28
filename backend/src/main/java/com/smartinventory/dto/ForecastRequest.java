package com.smartinventory.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;

public record ForecastRequest(
        @NotNull @Positive Long productId,
        @NotNull @Min(1) @Max(90) Integer horizonDays,
        @Positive Long warehouseId,
        LocalDate startDate,
        Boolean includeConfidenceIntervals
) {
}
