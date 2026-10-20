package com.smartinventory.controller;

import com.smartinventory.dto.ApiResponse;
import com.smartinventory.dto.DashboardKpiResponse;
import com.smartinventory.dto.InventoryReportResponse;
import com.smartinventory.dto.StockAlertResponse;
import com.smartinventory.dto.TransactionReportResponse;
import com.smartinventory.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/alerts/stock")
    public ApiResponse<List<StockAlertResponse>> getStockAlerts(
            @RequestParam(required = false) String type) {
        return ApiResponse.success(dashboardService.getStockAlerts(type));
    }

    @GetMapping("/dashboard/kpis")
    public ApiResponse<DashboardKpiResponse> getKpis() {
        return ApiResponse.success(dashboardService.getKpis());
    }

    @GetMapping("/reports/inventory")
    public ApiResponse<InventoryReportResponse> getInventoryReport(
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String status) {
        return ApiResponse.success(dashboardService.getInventoryReport(warehouseId, categoryId, status));
    }

    @GetMapping("/reports/transactions")
    public ApiResponse<TransactionReportResponse> getTransactionReport(
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) Long productId) {
        return ApiResponse.success(dashboardService.getTransactionReport(from, to, type, warehouseId, productId));
    }
}
