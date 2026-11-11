package com.smartinventory.repository;

import com.smartinventory.model.PurchaseOrder;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {

    @Query("""
            SELECT DISTINCT po FROM PurchaseOrder po
            JOIN FETCH po.supplier s
            JOIN FETCH po.destinationWarehouse w
            JOIN FETCH po.createdBy cb
            LEFT JOIN FETCH po.items i
            LEFT JOIN FETCH i.product p
            WHERE (:status IS NULL OR po.status = :status)
              AND (:supplierId IS NULL OR s.id = :supplierId)
              AND (:warehouseId IS NULL OR w.id = :warehouseId)
            ORDER BY po.createdAt DESC
            """)
    List<PurchaseOrder> search(@Param("status") String status,
                               @Param("supplierId") Long supplierId,
                               @Param("warehouseId") Long warehouseId);

    @Query("""
            SELECT po FROM PurchaseOrder po
            JOIN FETCH po.supplier s
            JOIN FETCH po.destinationWarehouse w
            JOIN FETCH po.createdBy cb
            LEFT JOIN FETCH po.items i
            LEFT JOIN FETCH i.product p
            WHERE po.id = :id
            """)
    Optional<PurchaseOrder> findByIdWithDetails(@Param("id") Long id);

    /** Khóa dòng PO để hai lần nhận hàng đồng thời không cộng tồn kho hai lần. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT po FROM PurchaseOrder po WHERE po.id = :id")
    Optional<PurchaseOrder> findByIdForUpdate(@Param("id") Long id);

    boolean existsByPoNumber(String poNumber);

    /** PO đã nhận đủ của nhà cung cấp: dùng để đo lead time thực tế. */
    @Query("""
            SELECT po FROM PurchaseOrder po
            WHERE po.supplier.id = :supplierId
              AND po.status = 'RECEIVED'
              AND po.actualDeliveryDate IS NOT NULL
            ORDER BY po.actualDeliveryDate DESC
            """)
    List<PurchaseOrder> findDeliveredBySupplier(@Param("supplierId") Long supplierId);
}
