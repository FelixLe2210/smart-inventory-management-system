package com.smartinventory.dto;

import com.smartinventory.model.Product;
import com.smartinventory.model.PurchaseOrder;
import com.smartinventory.model.PurchaseOrderItem;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record PurchaseOrderResponse(
        Long id,
        String poNumber,
        Long supplierId,
        String supplierCode,
        String supplierName,
        Long warehouseId,
        String warehouseCode,
        String warehouseName,
        String status,
        LocalDateTime orderDate,
        LocalDate expectedDeliveryDate,
        LocalDate actualDeliveryDate,
        BigDecimal totalAmount,
        String note,
        Long aiRecommendationId,
        String createdBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<Item> items
) {
    public record Item(
            Long id,
            Long productId,
            String productSku,
            String productName,
            String unit,
            Integer orderedQty,
            Integer receivedQty,
            Integer remainingQty,
            BigDecimal unitPrice,
            BigDecimal totalPrice
    ) {
        static Item from(PurchaseOrderItem item) {
            Product p = item.getProduct();
            return new Item(item.getId(), p.getId(), p.getSku(), p.getName(), p.getUnit(),
                    item.getOrderedQty(), item.getReceivedQty(), item.getRemainingQty(),
                    item.getUnitPrice(), item.getTotalPrice());
        }
    }

    public static PurchaseOrderResponse from(PurchaseOrder po) {
        return new PurchaseOrderResponse(
                po.getId(),
                po.getPoNumber(),
                po.getSupplier().getId(),
                po.getSupplier().getCode(),
                po.getSupplier().getName(),
                po.getDestinationWarehouse().getId(),
                po.getDestinationWarehouse().getCode(),
                po.getDestinationWarehouse().getName(),
                po.getStatus(),
                po.getOrderDate(),
                po.getExpectedDeliveryDate(),
                po.getActualDeliveryDate(),
                po.getTotalAmount(),
                po.getNote(),
                po.getAiRecommendationId(),
                po.getCreatedBy() != null ? po.getCreatedBy().getUsername() : null,
                po.getCreatedAt(),
                po.getUpdatedAt(),
                po.getItems().stream().map(Item::from).toList()
        );
    }
}
