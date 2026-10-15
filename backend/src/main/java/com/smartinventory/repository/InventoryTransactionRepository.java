package com.smartinventory.repository;

import com.smartinventory.model.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Long> {

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
}
