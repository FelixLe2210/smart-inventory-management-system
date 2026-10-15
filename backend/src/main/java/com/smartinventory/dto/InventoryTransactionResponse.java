package com.smartinventory.dto;

import com.smartinventory.model.InventoryTransaction;

import java.time.LocalDateTime;

public record InventoryTransactionResponse(
        Long id,
        String transactionCode,
        String transactionType,
        Long productId,
        Long sourceWarehouseId,
        Long destinationWarehouseId,
        Integer quantity,
        Integer balanceBefore,
        Integer balanceAfter,
        String referenceDoc,
        String reason,
        Long createdBy,
        LocalDateTime createdAt
) {
    public static InventoryTransactionResponse from(InventoryTransaction transaction) {
        return new InventoryTransactionResponse(
                transaction.getId(),
                transaction.getTransactionCode(),
                transaction.getTransactionType(),
                transaction.getProduct().getId(),
                transaction.getSourceWarehouse() != null ? transaction.getSourceWarehouse().getId() : null,
                transaction.getDestinationWarehouse() != null ? transaction.getDestinationWarehouse().getId() : null,
                transaction.getQuantity(),
                transaction.getBalanceBefore(),
                transaction.getBalanceAfter(),
                transaction.getReferenceDoc(),
                transaction.getReason(),
                transaction.getCreatedBy().getId(),
                transaction.getCreatedAt()
        );
    }
}
