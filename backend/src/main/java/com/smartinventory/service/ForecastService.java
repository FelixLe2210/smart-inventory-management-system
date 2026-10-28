package com.smartinventory.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.smartinventory.dto.ForecastModelInfoResponse;
import com.smartinventory.dto.ForecastPredictionResponse;
import com.smartinventory.dto.ForecastRequest;
import com.smartinventory.dto.ForecastResponse;
import com.smartinventory.exception.AiServiceException;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.net.SocketTimeoutException;
import java.net.http.HttpTimeoutException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class ForecastService {

    private final RestClient aiServiceClient;

    public ForecastService(RestClient aiServiceRestClient) {
        this.aiServiceClient = aiServiceRestClient;
    }

    public ForecastResponse createForecast(ForecastRequest request) {
        AiForecastRequest aiRequest = new AiForecastRequest(
                request.productId(),
                request.warehouseId(),
                request.horizonDays(),
                request.startDate() == null ? null : request.startDate().toString(),
                request.includeConfidenceIntervals() == null || request.includeConfidenceIntervals()
        );

        AiEnvelope<AiForecastResponse> envelope = execute(() -> aiServiceClient.post()
                .uri("/api/forecast/demand")
                .body(aiRequest)
                .retrieve()
                .body(new ParameterizedTypeReference<AiEnvelope<AiForecastResponse>>() { }));

        if (envelope == null || !envelope.success() || envelope.data() == null) {
            throw invalidResponse();
        }
        return mapForecast(envelope.data(), request);
    }

    public ForecastModelInfoResponse getModelInfo() {
        AiEnvelope<AiModelInfoResponse> envelope = execute(() -> aiServiceClient.get()
                .uri("/api/forecast/models")
                .retrieve()
                .body(new ParameterizedTypeReference<AiEnvelope<AiModelInfoResponse>>() { }));

        if (envelope == null || !envelope.success() || envelope.data() == null
                || envelope.data().isLoaded() == null) {
            throw invalidResponse();
        }
        AiModelInfoResponse model = envelope.data();
        return new ForecastModelInfoResponse(
                model.modelName(),
                model.isLoaded(),
                model.version(),
                model.trainedAt(),
                model.metrics(),
                model.features(),
                model.algorithm()
        );
    }

    private ForecastResponse mapForecast(AiForecastResponse response, ForecastRequest request) {
        if (!Objects.equals(response.productId(), request.productId())
                || !Objects.equals(response.warehouseId(), request.warehouseId())
                || !Objects.equals(response.horizonDays(), request.horizonDays())
                || response.predictions() == null
                || response.predictions().size() != request.horizonDays()
                || response.forecastStartDate() == null
                || response.forecastEndDate() == null
                || response.modelName() == null
                || response.modelVersion() == null
                || response.totalPredictedDemand() == null
                || !Double.isFinite(response.totalPredictedDemand())
                || response.dailyAverage() == null
                || !Double.isFinite(response.dailyAverage())
                || response.fallbackApplied() == null) {
            throw invalidResponse();
        }

        LocalDate startDate = response.forecastStartDate();
        LocalDate endDate = startDate.plusDays(request.horizonDays() - 1L);
        if (!response.forecastEndDate().equals(endDate)
                || (request.startDate() != null && !request.startDate().equals(startDate))) {
            throw invalidResponse();
        }

        double total = 0;
        java.util.ArrayList<ForecastPredictionResponse> predictions = new java.util.ArrayList<>();
        for (int i = 0; i < response.predictions().size(); i++) {
            AiPredictionPoint point = response.predictions().get(i);
            LocalDate expectedDate = startDate.plusDays(i);
            if (point == null
                    || !expectedDate.equals(point.date())
                    || point.dayOfWeek() == null
                    || point.predictedDemand() == null
                    || point.lowerBound() == null
                    || point.upperBound() == null
                    || !isValidDemand(point.predictedDemand())
                    || !isValidDemand(point.lowerBound())
                    || !isValidDemand(point.upperBound())
                    || point.lowerBound() > point.predictedDemand()
                    || point.upperBound() < point.predictedDemand()) {
                throw invalidResponse();
            }
            total += point.predictedDemand();
            predictions.add(new ForecastPredictionResponse(
                    point.date(),
                    point.dayOfWeek(),
                    point.predictedDemand(),
                    point.lowerBound(),
                    point.upperBound()
            ));
        }

        double roundedTotal = Math.round(total * 10.0) / 10.0;
        double dailyAverage = Math.round((roundedTotal / request.horizonDays()) * 10.0) / 10.0;
        return new ForecastResponse(
                response.productId(),
                response.warehouseId(),
                startDate,
                endDate,
                request.horizonDays(),
                List.copyOf(predictions),
                roundedTotal,
                dailyAverage,
                response.modelName(),
                response.modelVersion(),
                response.fallbackApplied()
        );
    }

    private <T> T execute(java.util.function.Supplier<T> request) {
        try {
            return request.get();
        } catch (ResourceAccessException exception) {
            if (isTimeout(exception)) {
                throw new AiServiceException(
                        "AI_SERVICE_TIMEOUT",
                        "AI service did not respond before the request timed out.",
                        HttpStatus.GATEWAY_TIMEOUT
                );
            }
            throw new AiServiceException(
                    "AI_SERVICE_UNAVAILABLE",
                    "AI service is unavailable. Please try again later.",
                    HttpStatus.BAD_GATEWAY
            );
        } catch (RestClientResponseException exception) {
            throw new AiServiceException(
                    "AI_SERVICE_ERROR",
                    "AI service could not process the forecast request.",
                    HttpStatus.BAD_GATEWAY
            );
        } catch (RestClientException exception) {
            throw invalidResponse();
        }
    }

    private static boolean isTimeout(Throwable exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof SocketTimeoutException || cause instanceof HttpTimeoutException) {
                return true;
            }
        }
        return false;
    }

    private static boolean isValidDemand(double value) {
        return Double.isFinite(value) && value >= 0;
    }

    private static AiServiceException invalidResponse() {
        return new AiServiceException(
                "AI_SERVICE_INVALID_RESPONSE",
                "AI service returned a response that does not match the forecast contract.",
                HttpStatus.BAD_GATEWAY
        );
    }

    private record AiForecastRequest(
            @JsonProperty("product_id") Long productId,
            @JsonProperty("warehouse_id") Long warehouseId,
            @JsonProperty("horizon_days") Integer horizonDays,
            @JsonProperty("start_date") String startDate,
            @JsonProperty("include_confidence_intervals") boolean includeConfidenceIntervals
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AiEnvelope<T>(
            boolean success,
            T data,
            AiError error
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AiError(String code, String message, List<String> details) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AiForecastResponse(
            @JsonProperty("product_id") Long productId,
            @JsonProperty("warehouse_id") Long warehouseId,
            @JsonProperty("forecast_start_date") LocalDate forecastStartDate,
            @JsonProperty("forecast_end_date") LocalDate forecastEndDate,
            @JsonProperty("horizon_days") Integer horizonDays,
            List<AiPredictionPoint> predictions,
            @JsonProperty("total_predicted_demand") Double totalPredictedDemand,
            @JsonProperty("daily_average") Double dailyAverage,
            @JsonProperty("model_name") String modelName,
            @JsonProperty("model_version") String modelVersion,
            @JsonProperty("fallback_applied") Boolean fallbackApplied
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AiPredictionPoint(
            LocalDate date,
            @JsonProperty("day_of_week") String dayOfWeek,
            @JsonProperty("predicted_demand") Double predictedDemand,
            @JsonProperty("lower_bound") Double lowerBound,
            @JsonProperty("upper_bound") Double upperBound
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AiModelInfoResponse(
            @JsonProperty("model_name") String modelName,
                @JsonProperty("is_loaded") Boolean isLoaded,
            String version,
            @JsonProperty("trained_at") String trainedAt,
            Map<String, Double> metrics,
            List<String> features,
            String algorithm
    ) {
    }
}
