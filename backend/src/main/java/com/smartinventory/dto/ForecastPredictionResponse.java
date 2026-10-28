package com.smartinventory.dto;

import java.time.LocalDate;

public record ForecastPredictionResponse(
        LocalDate date,
        String dayOfWeek,
        double predictedDemand,
        double lowerBound,
        double upperBound
) {
}
