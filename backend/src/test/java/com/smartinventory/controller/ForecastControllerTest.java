package com.smartinventory.controller;

import com.smartinventory.config.SecurityConfig;
import com.smartinventory.dto.ForecastModelInfoResponse;
import com.smartinventory.dto.ForecastPredictionResponse;
import com.smartinventory.dto.ForecastRequest;
import com.smartinventory.dto.ForecastResponse;
import com.smartinventory.exception.AiServiceException;
import com.smartinventory.security.JwtService;
import com.smartinventory.service.ForecastService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ForecastController.class)
@Import({SecurityConfig.class, JwtService.class})
@TestPropertySource(properties = {
        "app.jwt.secret=test-secret-key-that-is-at-least-32-bytes-long",
        "app.jwt.expiration-ms=3600000"
})
class ForecastControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private ForecastService forecastService;

    @Test
    void forecastRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/forecast/demand")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId":1,"horizonDays":7}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void forecastValidatesRequestAndMapsBackendResponse() throws Exception {
        ForecastResponse response = new ForecastResponse(
                7L, 3L, LocalDate.parse("2026-10-29"), LocalDate.parse("2026-10-30"), 2,
                List.of(new ForecastPredictionResponse(
                                LocalDate.parse("2026-10-29"), "Thursday", 12.5, 9.0, 16.0),
                        new ForecastPredictionResponse(
                                LocalDate.parse("2026-10-30"), "Friday", 10.0, 7.0, 13.0)),
                22.5, 11.3, "random_forest", "1.0.0", false);
        when(forecastService.createForecast(any(ForecastRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/forecast/demand")
                        .header("Authorization", bearerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId":7,"warehouseId":3,"horizonDays":2,"includeConfidenceIntervals":true}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.productId").value(7))
                .andExpect(jsonPath("$.data.horizonDays").value(2))
                .andExpect(jsonPath("$.data.predictions.length()").value(2))
                .andExpect(jsonPath("$.data.predictions[0].predictedDemand").value(12.5))
                .andExpect(jsonPath("$.data.fallbackApplied").value(false));

        verify(forecastService).createForecast(any(ForecastRequest.class));
    }

    @Test
    void forecastRejectsHorizonOutsideAiContract() throws Exception {
        mockMvc.perform(post("/api/forecast/demand")
                        .header("Authorization", bearerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId":7,"horizonDays":91}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void forecastReturnsGatewayErrorWhenAiServiceIsUnavailable() throws Exception {
        when(forecastService.createForecast(any(ForecastRequest.class))).thenThrow(
                new AiServiceException(
                        "AI_SERVICE_UNAVAILABLE",
                        "AI service is unavailable. Please try again later.",
                        HttpStatus.BAD_GATEWAY
                ));

        mockMvc.perform(post("/api/forecast/demand")
                        .header("Authorization", bearerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId":7,"horizonDays":2}
                                """))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("AI_SERVICE_UNAVAILABLE"));
    }

    @Test
    void modelInfoIsMappedThroughApiEnvelope() throws Exception {
        when(forecastService.getModelInfo()).thenReturn(new ForecastModelInfoResponse(
                "random_forest", true, "1.0.0", "2026-10-28T00:00:00Z",
                Map.of("mape", 12.5), List.of("lag_1"), "random_forest"));

        mockMvc.perform(get("/api/forecast/models")
                        .header("Authorization", bearerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.modelName").value("random_forest"))
                .andExpect(jsonPath("$.data.isLoaded").value(true))
                .andExpect(jsonPath("$.data.metrics.mape").value(12.5));
    }

    private String bearerToken() {
        return "Bearer " + jwtService.generateToken("admin", List.of("ADMIN"));
    }
}
