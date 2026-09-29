package com.smartinventory.controller;

import com.smartinventory.dto.ApiResponse;
import com.smartinventory.dto.WarehouseRequest;
import com.smartinventory.dto.WarehouseResponse;
import com.smartinventory.service.WarehouseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/warehouses")
public class WarehouseController {

    private final WarehouseService warehouseService;

    public WarehouseController(WarehouseService warehouseService) {
        this.warehouseService = warehouseService;
    }

    @GetMapping
    public ApiResponse<List<WarehouseResponse>> getAllWarehouses() {
        return ApiResponse.success(warehouseService.getAllWarehouses());
    }

    @GetMapping("/{id}")
    public ApiResponse<WarehouseResponse> getWarehouseById(@PathVariable Long id) {
        return ApiResponse.success(warehouseService.getWarehouseById(id));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WarehouseResponse>> createWarehouse(@Valid @RequestBody WarehouseRequest request) {
        WarehouseResponse created = warehouseService.createWarehouse(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    @PutMapping("/{id}")
    public ApiResponse<WarehouseResponse> updateWarehouse(@PathVariable Long id,
                                                         @Valid @RequestBody WarehouseRequest request) {
        WarehouseResponse updated = warehouseService.updateWarehouse(id, request);
        return ApiResponse.success(updated);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteWarehouse(@PathVariable Long id) {
        warehouseService.deleteWarehouse(id);
        return ApiResponse.success(null);
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<WarehouseResponse> updateWarehouseStatus(@PathVariable Long id,
                                                               @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || status.isBlank()) {
            throw new com.smartinventory.exception.BadRequestException("INVALID_STATUS", "Trạng thái không được để trống");
        }
        return ApiResponse.success(warehouseService.updateStatus(id, status));
    }
}
