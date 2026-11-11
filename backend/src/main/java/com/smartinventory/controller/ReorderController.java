package com.smartinventory.controller;

import com.smartinventory.dto.ApiResponse;
import com.smartinventory.dto.PurchaseOrderResponse;
import com.smartinventory.dto.ReorderAcceptRequest;
import com.smartinventory.dto.ReorderGenerateRequest;
import com.smartinventory.dto.ReorderRecommendationResponse;
import com.smartinventory.service.ReorderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reorder")
public class ReorderController {

    private final ReorderService reorderService;

    public ReorderController(ReorderService reorderService) {
        this.reorderService = reorderService;
    }

    @GetMapping("/recommendations")
    public ApiResponse<List<ReorderRecommendationResponse>> list(@RequestParam(required = false) String status) {
        return ApiResponse.success(reorderService.list(status));
    }

    @GetMapping("/recommendations/{id}")
    public ApiResponse<ReorderRecommendationResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(reorderService.getById(id));
    }

    /** Tính lại đề xuất (gọi AI service). Body tùy chọn: {@code {"productId":1,"warehouseId":2}}. */
    @PostMapping("/recommendations/generate")
    public ApiResponse<List<ReorderRecommendationResponse>> generate(
            @Valid @RequestBody(required = false) ReorderGenerateRequest request) {
        Long productId = request != null ? request.productId() : null;
        Long warehouseId = request != null ? request.warehouseId() : null;
        return ApiResponse.success(reorderService.generate(productId, warehouseId));
    }

    /** Chấp nhận đề xuất -> tạo Purchase Order DRAFT. */
    @PostMapping("/recommendations/{id}/accept")
    public ResponseEntity<ApiResponse<PurchaseOrderResponse>> accept(
            @PathVariable Long id, @Valid @RequestBody(required = false) ReorderAcceptRequest request) {
        PurchaseOrderResponse po = reorderService.accept(id, request != null ? request.quantity() : null);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(po));
    }

    @PostMapping("/recommendations/{id}/reject")
    public ApiResponse<ReorderRecommendationResponse> reject(@PathVariable Long id) {
        return ApiResponse.success(reorderService.reject(id));
    }
}
