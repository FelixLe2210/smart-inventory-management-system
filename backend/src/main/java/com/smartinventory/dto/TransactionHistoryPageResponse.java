package com.smartinventory.dto;

import org.springframework.data.domain.Page;

import java.util.List;

public record TransactionHistoryPageResponse(
        List<InventoryTransactionResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last
) {
    public static TransactionHistoryPageResponse from(Page<InventoryTransactionResponse> page) {
        return new TransactionHistoryPageResponse(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast()
        );
    }
}
