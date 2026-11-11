package com.smartinventory.dto;

import java.time.LocalDate;
import java.util.List;

public record ForecastResponse(
        Long productId,
        Long warehouseId,
        LocalDate forecastStartDate,
        LocalDate forecastEndDate,
        int horizonDays,
        List<ForecastPredictionResponse> predictions,
        double totalPredictedDemand,
        double dailyAverage,
        String modelName,
        String modelVersion,
        boolean fallbackApplied,
        String historySource
) {
    /** Keeps the pre-historySource constructor; source is then unknown. */
    public ForecastResponse(Long productId, Long warehouseId, LocalDate forecastStartDate,
                            LocalDate forecastEndDate, int horizonDays,
                            List<ForecastPredictionResponse> predictions, double totalPredictedDemand,
                            double dailyAverage, String modelName, String modelVersion,
                            boolean fallbackApplied) {
        this(productId, warehouseId, forecastStartDate, forecastEndDate, horizonDays, predictions,
                totalPredictedDemand, dailyAverage, modelName, modelVersion, fallbackApplied, null);
    }
}
