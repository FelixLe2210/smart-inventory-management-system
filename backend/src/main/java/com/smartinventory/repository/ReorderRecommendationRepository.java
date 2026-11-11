package com.smartinventory.repository;

import com.smartinventory.model.ReorderRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReorderRecommendationRepository extends JpaRepository<ReorderRecommendation, Long> {

    @Query("""
            SELECT r FROM ReorderRecommendation r
            JOIN FETCH r.product p
            LEFT JOIN FETCH p.supplier s
            JOIN FETCH r.warehouse w
            WHERE (:status IS NULL OR r.status = :status)
            ORDER BY r.createdAt DESC
            """)
    List<ReorderRecommendation> search(@Param("status") String status);

    @Query("""
            SELECT r FROM ReorderRecommendation r
            JOIN FETCH r.product p
            LEFT JOIN FETCH p.supplier s
            JOIN FETCH r.warehouse w
            WHERE r.id = :id
            """)
    Optional<ReorderRecommendation> findByIdWithDetails(@Param("id") Long id);

    Optional<ReorderRecommendation> findFirstByProductIdAndWarehouseIdAndStatus(
            Long productId, Long warehouseId, String status);
}
