package com.smartinventory.dto;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartinventory.model.Product;
import com.smartinventory.model.ReorderRecommendation;
import com.smartinventory.model.Supplier;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record ReorderRecommendationResponse(
        Long id,
        String recommendationCode,
        Long productId,
        String productSku,
        String productName,
        String unit,
        Long warehouseId,
        String warehouseCode,
        String warehouseName,
        Long supplierId,
        String supplierName,
        Integer currentStock,
        Integer incomingStock,
        Integer supplierLeadTimeDays,
        Integer safetyStock,
        Integer reorderPoint,
        Integer recommendedOrderQty,
        LocalDate suggestedOrderDate,
        LocalDate expectedArrivalDate,
        String urgencyLevel,
        String shortageRisk,
        BigDecimal stockoutProbability,
        BigDecimal avgDailyDemand,
        String action,
        String status,
        Long purchaseOrderId,
        /** Toàn bộ lời giải thích của AI: reasons, warnings, assumptions, history_source... */
        JsonNode details,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static ReorderRecommendationResponse from(ReorderRecommendation r, ObjectMapper mapper) {
        Product p = r.getProduct();
        Supplier s = p.getSupplier();
        JsonNode details = null;
        if (r.getDetailsJson() != null) {
            try {
                details = mapper.readTree(r.getDetailsJson());
            } catch (JsonProcessingException ignored) {
                details = null;
            }
        }
        String action = details != null && details.hasNonNull("action") ? details.get("action").asText() : null;
        return new ReorderRecommendationResponse(
                r.getId(), r.getRecommendationCode(),
                p.getId(), p.getSku(), p.getName(), p.getUnit(),
                r.getWarehouse().getId(), r.getWarehouse().getCode(), r.getWarehouse().getName(),
                s != null ? s.getId() : null, s != null ? s.getName() : null,
                r.getCurrentStock(), r.getIncomingStock(), r.getSupplierLeadTimeDays(),
                r.getSafetyStock(), r.getReorderPoint(), r.getRecommendedOrderQty(),
                r.getSuggestedOrderDate(), r.getExpectedArrivalDate(),
                r.getUrgencyLevel(), r.getShortageRisk(), r.getStockoutProbability(), r.getAvgDailyDemand(),
                action, r.getStatus(), r.getPurchaseOrderId(), details,
                r.getCreatedAt(), r.getUpdatedAt());
    }
}
