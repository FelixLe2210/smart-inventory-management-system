package com.smartinventory.dto;

import java.time.LocalDateTime;
import java.util.List;

public record TransactionReportResponse(Summary summary, List<TypeSummary> byType, List<Row> rows) {
    public record Summary(
            long totalCount,
            long receivedQuantity,
            long issuedQuantity,
            long transferredQuantity,
            long adjustmentCount,
            long netChange
    ) {
    }

    public record TypeSummary(String type, String label, long count, long quantity) {
    }

    public record Row(
            Long id,
            String transactionCode,
            String transactionNo,
            Integer lineNo,
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
            LocalDateTime createdAt,
            String productSku,
            String productName
    ) {
    }
}
