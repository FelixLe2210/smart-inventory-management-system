package com.smartinventory.repository;

import com.smartinventory.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findBySku(String sku);
    boolean existsBySku(String sku);
    boolean existsBySkuAndIdNot(String sku, Long id);
    boolean existsByBarcode(String barcode);
    boolean existsByBarcodeAndIdNot(String barcode, Long id);
    List<Product> findByCategoryId(Long categoryId);
    List<Product> findBySupplierId(Long supplierId);
}
