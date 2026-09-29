package com.smartinventory.dto;

import com.smartinventory.model.Product;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Response payload cho một sản phẩm (bao gồm thông tin category và supplier gọn). */
public class ProductResponse {

    private Long id;
    private String sku;
    private String barcode;
    private String name;
    private String description;
    private Long categoryId;
    private String categoryName;
    private Long supplierId;
    private String supplierName;
    private String unit;
    private BigDecimal purchasePrice;
    private BigDecimal sellingPrice;
    private Integer minStockLevel;
    private Integer maxStockLevel;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ProductResponse from(Product p) {
        ProductResponse r = new ProductResponse();
        r.id = p.getId();
        r.sku = p.getSku();
        r.barcode = p.getBarcode();
        r.name = p.getName();
        r.description = p.getDescription();
        r.unit = p.getUnit();
        r.purchasePrice = p.getPurchasePrice();
        r.sellingPrice = p.getSellingPrice();
        r.minStockLevel = p.getMinStockLevel();
        r.maxStockLevel = p.getMaxStockLevel();
        r.status = p.getStatus();
        r.createdAt = p.getCreatedAt();
        r.updatedAt = p.getUpdatedAt();
        if (p.getCategory() != null) {
            r.categoryId = p.getCategory().getId();
            r.categoryName = p.getCategory().getName();
        }
        if (p.getSupplier() != null) {
            r.supplierId = p.getSupplier().getId();
            r.supplierName = p.getSupplier().getName();
        }
        return r;
    }

    public Long getId() { return id; }
    public String getSku() { return sku; }
    public String getBarcode() { return barcode; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public Long getCategoryId() { return categoryId; }
    public String getCategoryName() { return categoryName; }
    public Long getSupplierId() { return supplierId; }
    public String getSupplierName() { return supplierName; }
    public String getUnit() { return unit; }
    public BigDecimal getPurchasePrice() { return purchasePrice; }
    public BigDecimal getSellingPrice() { return sellingPrice; }
    public Integer getMinStockLevel() { return minStockLevel; }
    public Integer getMaxStockLevel() { return maxStockLevel; }
    public String getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
