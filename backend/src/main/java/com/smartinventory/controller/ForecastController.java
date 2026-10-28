package com.smartinventory.controller;

import com.smartinventory.dto.ApiResponse;
import com.smartinventory.dto.ForecastModelInfoResponse;
import com.smartinventory.dto.ForecastRequest;
import com.smartinventory.dto.ForecastResponse;
import com.smartinventory.service.ForecastService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/forecast")
public class ForecastController {

    private final ForecastService forecastService;

    public ForecastController(ForecastService forecastService) {
        this.forecastService = forecastService;
    }

    @PostMapping("/demand")
    public ApiResponse<ForecastResponse> createForecast(@Valid @RequestBody ForecastRequest request) {
        return ApiResponse.success(forecastService.createForecast(request));
    }

    @GetMapping("/models")
    public ApiResponse<ForecastModelInfoResponse> getModelInfo() {
        return ApiResponse.success(forecastService.getModelInfo());
    }
}
