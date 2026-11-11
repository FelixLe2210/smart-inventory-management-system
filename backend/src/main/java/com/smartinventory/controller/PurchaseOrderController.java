package com.smartinventory.controller;

import com.smartinventory.dto.ApiResponse;
import com.smartinventory.dto.PurchaseOrderReceiveRequest;
import com.smartinventory.dto.PurchaseOrderRequest;
import com.smartinventory.dto.PurchaseOrderResponse;
import com.smartinventory.service.PurchaseOrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/purchase-orders")
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    public PurchaseOrderController(PurchaseOrderService purchaseOrderService) {
        this.purchaseOrderService = purchaseOrderService;
    }

    @GetMapping
    public ApiResponse<List<PurchaseOrderResponse>> search(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) Long warehouseId) {
        return ApiResponse.success(purchaseOrderService.search(status, supplierId, warehouseId));
    }

    @GetMapping("/{id}")
    public ApiResponse<PurchaseOrderResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(purchaseOrderService.getById(id));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> create(@Valid @RequestBody PurchaseOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(purchaseOrderService.create(request)));
    }

    @PutMapping("/{id}")
    public ApiResponse<PurchaseOrderResponse> update(@PathVariable Long id,
                                                     @Valid @RequestBody PurchaseOrderRequest request) {
        return ApiResponse.success(purchaseOrderService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        purchaseOrderService.delete(id);
        return ApiResponse.success(null);
    }

    @PostMapping("/{id}/send")
    public ApiResponse<PurchaseOrderResponse> send(@PathVariable Long id) {
        return ApiResponse.success(purchaseOrderService.send(id));
    }

    @PostMapping("/{id}/cancel")
    public ApiResponse<PurchaseOrderResponse> cancel(@PathVariable Long id) {
        return ApiResponse.success(purchaseOrderService.cancel(id));
    }

    @PostMapping("/{id}/receive")
    public ApiResponse<PurchaseOrderResponse> receive(@PathVariable Long id,
                                                      @Valid @RequestBody PurchaseOrderReceiveRequest request) {
        return ApiResponse.success(purchaseOrderService.receive(id, request));
    }
}
