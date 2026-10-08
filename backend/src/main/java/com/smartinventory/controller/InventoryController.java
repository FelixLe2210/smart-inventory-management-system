package com.smartinventory.controller;

import com.smartinventory.dto.ApiResponse;
import com.smartinventory.dto.InventoryAdjustRequest;
import com.smartinventory.dto.InventoryCreateRequest;
import com.smartinventory.dto.InventoryResponse;
import com.smartinventory.dto.InventoryUpdateRequest;
import com.smartinventory.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventories")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    public ApiResponse<List<InventoryResponse>> getAllInventories(
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) Boolean lowStock) {
        return ApiResponse.success(inventoryService.getAllInventories(productId, warehouseId, lowStock));
    }

    @GetMapping("/{id}")
    public ApiResponse<InventoryResponse> getInventoryById(@PathVariable Long id) {
        return ApiResponse.success(inventoryService.getInventoryById(id));
    }

    @GetMapping("/product/{productId}/warehouse/{warehouseId}")
    public ApiResponse<InventoryResponse> getByProductAndWarehouse(
            @PathVariable Long productId,
            @PathVariable Long warehouseId) {
        return ApiResponse.success(inventoryService.getInventoryByProductAndWarehouse(productId, warehouseId));
    }

    @GetMapping("/low-stock")
    public ApiResponse<List<InventoryResponse>> getLowStockInventories() {
        return ApiResponse.success(inventoryService.getLowStockInventories());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<InventoryResponse>> createInventory(
            @Valid @RequestBody InventoryCreateRequest request) {
        InventoryResponse response = inventoryService.createInventory(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    public ApiResponse<InventoryResponse> updateInventory(
            @PathVariable Long id,
            @Valid @RequestBody InventoryUpdateRequest request) {
        return ApiResponse.success(inventoryService.updateInventory(id, request));
    }

    @PostMapping("/{id}/adjust")
    public ApiResponse<InventoryResponse> adjustStock(
            @PathVariable Long id,
            @Valid @RequestBody InventoryAdjustRequest request) {
        return ApiResponse.success(inventoryService.adjustStock(id, request));
    }
}
