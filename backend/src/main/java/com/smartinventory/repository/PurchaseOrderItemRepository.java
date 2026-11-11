package com.smartinventory.repository;

import com.smartinventory.model.PurchaseOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface PurchaseOrderItemRepository extends JpaRepository<PurchaseOrderItem, Long> {

    /** Các dòng PO còn mở của một sản phẩm tại một kho đích (đầu vào "hàng đang về" cho AI #2). */
    @Query("""
            SELECT i FROM PurchaseOrderItem i
            JOIN FETCH i.purchaseOrder po
            WHERE i.product.id = :productId
              AND po.destinationWarehouse.id = :warehouseId
              AND po.status IN :statuses
            """)
    List<PurchaseOrderItem> findOpenItems(@Param("productId") Long productId,
                                          @Param("warehouseId") Long warehouseId,
                                          @Param("statuses") Collection<String> statuses);
}
