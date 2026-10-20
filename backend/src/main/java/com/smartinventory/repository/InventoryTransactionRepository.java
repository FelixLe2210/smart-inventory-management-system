package com.smartinventory.repository;

import com.smartinventory.model.InventoryTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.time.LocalDateTime;

public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Long> {

    @Query("""
            SELECT t FROM InventoryTransaction t
            JOIN FETCH t.product p
            LEFT JOIN FETCH t.sourceWarehouse s
            LEFT JOIN FETCH t.destinationWarehouse d
            JOIN FETCH t.createdBy u
            WHERE (:from IS NULL OR t.createdAt >= :from)
              AND (:toExclusive IS NULL OR t.createdAt < :toExclusive)
              AND (:transactionType IS NULL OR t.transactionType = :transactionType)
              AND (:productId IS NULL OR p.id = :productId)
              AND (:warehouseId IS NULL
                OR (t.transactionType IN ('RECEIVING', 'TRANSFER_IN') AND d.id = :warehouseId)
                OR (t.transactionType IN ('ISSUING', 'TRANSFER_OUT', 'ADJUSTMENT') AND s.id = :warehouseId))
            ORDER BY t.createdAt DESC, t.id DESC
            """)
    List<InventoryTransaction> findForReport(
            @Param("from") LocalDateTime from,
            @Param("toExclusive") LocalDateTime toExclusive,
            @Param("transactionType") String transactionType,
            @Param("warehouseId") Long warehouseId,
            @Param("productId") Long productId);

    @Query("""
            SELECT t FROM InventoryTransaction t
            JOIN FETCH t.product p
            LEFT JOIN FETCH t.sourceWarehouse s
            LEFT JOIN FETCH t.destinationWarehouse d
            JOIN FETCH t.createdBy u
            WHERE p.id = :productId
              AND ((s.id = :warehouseId AND t.transactionType <> 'TRANSFER_IN')
                OR (d.id = :warehouseId AND t.transactionType <> 'TRANSFER_OUT'))
            ORDER BY t.createdAt DESC, t.id DESC
            """)
    List<InventoryTransaction> findByProductAndWarehouse(
            @Param("productId") Long productId, @Param("warehouseId") Long warehouseId);

    @Query(value = """
            SELECT t FROM InventoryTransaction t
            JOIN FETCH t.product p
            LEFT JOIN FETCH t.sourceWarehouse s
            LEFT JOIN FETCH t.destinationWarehouse d
            JOIN FETCH t.createdBy u
            WHERE (:productId IS NULL OR p.id = :productId)
              AND (:transactionType IS NULL OR t.transactionType = :transactionType)
              AND (:warehouseId IS NULL
                OR (t.transactionType IN ('RECEIVING', 'TRANSFER_IN') AND d.id = :warehouseId)
                OR (t.transactionType IN ('ISSUING', 'TRANSFER_OUT', 'ADJUSTMENT') AND s.id = :warehouseId))
              AND (:search IS NULL
                OR LOWER(t.transactionCode) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(COALESCE(t.referenceDoc, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(COALESCE(t.reason, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')))
            ORDER BY t.createdAt DESC, t.id DESC
            """,
            countQuery = """
            SELECT COUNT(t) FROM InventoryTransaction t
            JOIN t.product p
            LEFT JOIN t.sourceWarehouse s
            LEFT JOIN t.destinationWarehouse d
            WHERE (:productId IS NULL OR p.id = :productId)
              AND (:transactionType IS NULL OR t.transactionType = :transactionType)
              AND (:warehouseId IS NULL
                OR (t.transactionType IN ('RECEIVING', 'TRANSFER_IN') AND d.id = :warehouseId)
                OR (t.transactionType IN ('ISSUING', 'TRANSFER_OUT', 'ADJUSTMENT') AND s.id = :warehouseId))
              AND (:search IS NULL
                OR LOWER(t.transactionCode) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(COALESCE(t.referenceDoc, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(COALESCE(t.reason, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<InventoryTransaction> searchTransactions(
            @Param("productId") Long productId,
            @Param("warehouseId") Long warehouseId,
            @Param("transactionType") String transactionType,
            @Param("search") String search,
            Pageable pageable);
}
