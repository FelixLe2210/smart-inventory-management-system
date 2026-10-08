package com.smartinventory.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Ánh xạ bảng {@code inventories} trong database.
 * Quản lý số lượng tồn kho theo từng cặp Sản phẩm (Product) và Kho (Warehouse).
 */
@Entity
@Table(name = "inventories", uniqueConstraints = {
    @UniqueConstraint(name = "uk_inventories_prod_wh", columnNames = {"product_id", "warehouse_id"})
})
public class Inventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @Column(name = "current_stock", nullable = false)
    private Integer currentStock = 0;

    @Column(name = "reserved_stock", nullable = false)
    private Integer reservedStock = 0;

    @Column(name = "location_in_warehouse", length = 50)
    private String locationInWarehouse;

    @Column(name = "last_stock_count_at")
    private LocalDateTime lastStockCountAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public Inventory() {
    }

    public Inventory(Product product, Warehouse warehouse, Integer currentStock, Integer reservedStock, String locationInWarehouse) {
        this.product = product;
        this.warehouse = warehouse;
        this.currentStock = currentStock != null ? currentStock : 0;
        this.reservedStock = reservedStock != null ? reservedStock : 0;
        this.locationInWarehouse = locationInWarehouse;
        this.updatedAt = LocalDateTime.now();
    }

    @PrePersist
    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Tồn kho khả dụng (Available Stock) = Tồn kho hiện tại - Số lượng giữ chỗ (Reserved)
     */
    public Integer getAvailableStock() {
        int current = currentStock != null ? currentStock : 0;
        int reserved = reservedStock != null ? reservedStock : 0;
        return Math.max(0, current - reserved);
    }

    /**
     * Xác định trạng thái tồn kho dựa theo định mức Min/Max của sản phẩm.
     */
    public String getStockStatus() {
        int current = currentStock != null ? currentStock : 0;
        if (current <= 0) {
            return "OUT_OF_STOCK";
        }
        if (product != null) {
            if (product.getMinStockLevel() != null && current <= product.getMinStockLevel()) {
                return "LOW_STOCK";
            }
            if (product.getMaxStockLevel() != null && current > product.getMaxStockLevel()) {
                return "OVER_STOCK";
            }
        }
        return "IN_STOCK";
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public Warehouse getWarehouse() {
        return warehouse;
    }

    public void setWarehouse(Warehouse warehouse) {
        this.warehouse = warehouse;
    }

    public Integer getCurrentStock() {
        return currentStock;
    }

    public void setCurrentStock(Integer currentStock) {
        this.currentStock = currentStock;
    }

    public Integer getReservedStock() {
        return reservedStock;
    }

    public void setReservedStock(Integer reservedStock) {
        this.reservedStock = reservedStock;
    }

    public String getLocationInWarehouse() {
        return locationInWarehouse;
    }

    public void setLocationInWarehouse(String locationInWarehouse) {
        this.locationInWarehouse = locationInWarehouse;
    }

    public LocalDateTime getLastStockCountAt() {
        return lastStockCountAt;
    }

    public void setLastStockCountAt(LocalDateTime lastStockCountAt) {
        this.lastStockCountAt = lastStockCountAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
