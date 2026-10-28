package com.smartinventory.dto;

import java.util.List;
import java.util.Map;

public record ForecastModelInfoResponse(
        String modelName,
        boolean isLoaded,
        String version,
        String trainedAt,
        Map<String, Double> metrics,
        List<String> features,
        String algorithm
) {
}
