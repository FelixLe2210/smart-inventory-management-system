package com.smartinventory.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartinventory.dto.ForecastRequest;
import com.smartinventory.exception.AiServiceException;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ForecastServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private HttpServer aiServer;
    private ForecastService forecastService;
    private AtomicReference<JsonNode> receivedRequest;
    private AtomicReference<String> forecastResponse;
    private AtomicReference<Integer> forecastStatus;

    @BeforeEach
    void setUp() throws IOException {
        receivedRequest = new AtomicReference<>();
        forecastResponse = new AtomicReference<>(forecastEnvelope());
        forecastStatus = new AtomicReference<>(200);
        aiServer = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        aiServer.createContext("/api/forecast/demand", exchange -> {
            receivedRequest.set(objectMapper.readTree(exchange.getRequestBody()));
            respond(exchange, forecastStatus.get(), forecastResponse.get());
        });
        aiServer.createContext("/api/forecast/models", exchange ->
                respond(exchange, 200, """
                        {"success":true,"data":{"model_name":"random_forest","is_loaded":true,
                         "version":"1.0.0","trained_at":"2026-10-28T00:00:00Z",
                         "metrics":{"mape":12.5,"mae":2.1},"features":["lag_1"],"algorithm":"random_forest"},
                         "error":null}
                        """));
        aiServer.start();
        forecastService = new ForecastService(RestClient.builder()
                .baseUrl("http://localhost:" + aiServer.getAddress().getPort())
                .build());
    }

    @AfterEach
    void tearDown() {
        aiServer.stop(0);
    }

    @Test
    void sendsAiRequestAndMapsSnakeCaseResponseToBackendDto() {
        var result = forecastService.createForecast(
                new ForecastRequest(7L, 2, 3L, LocalDate.parse("2026-10-29"), true));

        assertEquals(7, receivedRequest.get().get("product_id").asLong());
        assertEquals(3, receivedRequest.get().get("warehouse_id").asLong());
        assertEquals(2, receivedRequest.get().get("horizon_days").asInt());
        assertEquals("2026-10-29", receivedRequest.get().get("start_date").asText());
        assertEquals(true, receivedRequest.get().get("include_confidence_intervals").asBoolean());
        assertEquals(7L, result.productId());
        assertEquals(3L, result.warehouseId());
        assertEquals(LocalDate.parse("2026-10-29"), result.predictions().get(0).date());
        assertEquals(12.5, result.predictions().get(0).predictedDemand());
        assertEquals("random_forest", result.modelName());
        assertEquals(22.5, result.totalPredictedDemand());
    }

    @Test
    void mapsModelMetadataFromAiService() {
        var result = forecastService.getModelInfo();

        assertTrue(result.isLoaded());
        assertEquals("random_forest", result.modelName());
        assertEquals(12.5, result.metrics().get("mape"));
        assertEquals("lag_1", result.features().get(0));
    }

    @Test
    void rejectsMalformedAiForecastData() {
        forecastResponse.set("""
                {"success":true,"data":{"product_id":7,"warehouse_id":3,
                 "forecast_start_date":"2026-10-29","forecast_end_date":"2026-10-30",
                 "horizon_days":2,"predictions":[],"total_predicted_demand":0,
                 "daily_average":0,"model_name":"random_forest","model_version":"1.0.0",
                 "fallback_applied":false},"error":null}
                """);

        AiServiceException exception = assertThrows(AiServiceException.class, () ->
                forecastService.createForecast(new ForecastRequest(7L, 2, 3L, null, true)));
        assertEquals("AI_SERVICE_INVALID_RESPONSE", exception.getCode());
        assertEquals(502, exception.getStatus().value());
    }

    @Test
    void mapsAiServiceHttpFailuresToGatewayErrors() {
        forecastStatus.set(503);

        AiServiceException exception = assertThrows(AiServiceException.class, () ->
                forecastService.createForecast(new ForecastRequest(7L, 2, 3L, null, true)));
        assertEquals("AI_SERVICE_ERROR", exception.getCode());
        assertEquals(502, exception.getStatus().value());
    }

    private String forecastEnvelope() {
        return """
                {"success":true,"data":{"product_id":7,"warehouse_id":3,
                 "forecast_start_date":"2026-10-29","forecast_end_date":"2026-10-30",
                 "horizon_days":2,"predictions":[
                   {"date":"2026-10-29","day_of_week":"Thursday","predicted_demand":12.5,
                    "lower_bound":9.0,"upper_bound":16.0},
                   {"date":"2026-10-30","day_of_week":"Friday","predicted_demand":10.0,
                    "lower_bound":7.0,"upper_bound":13.0}],
                 "total_predicted_demand":22.5,"daily_average":11.2,
                 "model_name":"random_forest","model_version":"1.0.0","fallback_applied":false},
                 "error":null}
                """;
    }

    private static void respond(
            com.sun.net.httpserver.HttpExchange exchange,
            int status,
            String body
    ) throws IOException {
        byte[] response = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, response.length);
        try (var output = exchange.getResponseBody()) {
            output.write(response);
        }
    }
}
