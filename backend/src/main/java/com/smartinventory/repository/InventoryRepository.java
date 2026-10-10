package com.smartinventory.repository;

import com.smartinventory.model.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    @Query("SELECT i FROM Inventory i JOIN FETCH i.product p JOIN FETCH i.warehouse w WHERE i.id = :id")
    Optional<Inventory> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT i FROM Inventory i JOIN FETCH i.product p JOIN FETCH i.warehouse w WHERE p.id = :productId AND w.id = :warehouseId")
    Optional<Inventory> findByProductIdAndWarehouseId(@Param("productId") Long productId, @Param("warehouseId") Long warehouseId);

    boolean existsByProductIdAndWarehouseId(Long productId, Long warehouseId);

    /** Sprint4-15: kho đã có bản ghi tồn kho thì không được xóa (FK warehouse không cascade). */
    boolean existsByWarehouseId(Long warehouseId);

    /** Sprint4-15: sản phẩm còn hàng tồn ở bất kỳ kho nào thì không được xóa. */
    boolean existsByProductIdAndCurrentStockGreaterThan(Long productId, Integer stock);

    @Query("SELECT i FROM Inventory i JOIN FETCH i.product p JOIN FETCH i.warehouse w WHERE p.id = :productId")
    List<Inventory> findByProductId(@Param("productId") Long productId);

    @Query("SELECT i FROM Inventory i JOIN FETCH i.product p JOIN FETCH i.warehouse w WHERE w.id = :warehouseId")
    List<Inventory> findByWarehouseId(@Param("warehouseId") Long warehouseId);

    @Query("SELECT i FROM Inventory i JOIN FETCH i.product p JOIN FETCH i.warehouse w")
    List<Inventory> findAllWithDetails();

    @Query("SELECT i FROM Inventory i JOIN FETCH i.product p JOIN FETCH i.warehouse w WHERE i.currentStock <= p.minStockLevel")
    List<Inventory> findLowStockInventories();
}
