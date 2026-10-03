package com.smartinventory.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

/** Request body cho POST/PUT /api/products. */
public class ProductRequest {

    @NotBlank(message = "SKU không được để trống")
    @Size(min = 2, max = 50, message = "SKU phải từ 2 đến 50 ký tự")
    @Pattern(regexp = "^[A-Z0-9-_]+$", message = "SKU chỉ được chứa chữ in hoa, số, gạch ngang, gạch dưới")
    private String sku;

    @NotBlank(message = "Mã barcode không được để trống")
    @Size(max = 50, message = "Barcode không quá 50 ký tự")
    private String barcode;

    @NotBlank(message = "Tên sản phẩm không được để trống")
    @Size(max = 150, message = "Tên sản phẩm không quá 150 ký tự")
    private String name;

    private String description;

    @NotNull(message = "Danh mục không được để trống")
    private Long categoryId;

    private Long supplierId;

    @NotBlank(message = "Đơn vị tính không được để trống")
    @Size(max = 30, message = "Đơn vị tính không quá 30 ký tự")
    private String unit = "Cái";

    @NotNull(message = "Giá nhập không được để trống")
    @DecimalMin(value = "0.00", message = "Giá nhập không được âm")
    private BigDecimal purchasePrice;

    @NotNull(message = "Giá bán không được để trống")
    @DecimalMin(value = "0.00", message = "Giá bán không được âm")
    private BigDecimal sellingPrice;

    @Min(value = 0, message = "Tồn kho tối thiểu không được âm")
    private Integer minStockLevel = 10;

    @Min(value = 1, message = "Tồn kho tối đa phải >= 1")
    private Integer maxStockLevel = 500;

    @Pattern(regexp = "^(ACTIVE|INACTIVE)$", message = "Trạng thái phải là ACTIVE hoặc INACTIVE")
    private String status = "ACTIVE";

    // ── Getters & Setters ─────────────────────────────────────────────────

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public String getBarcode() { return barcode; }
    public void setBarcode(String barcode) { this.barcode = barcode; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

    public Long getSupplierId() { return supplierId; }
    public void setSupplierId(Long supplierId) { this.supplierId = supplierId; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public BigDecimal getPurchasePrice() { return purchasePrice; }
    public void setPurchasePrice(BigDecimal purchasePrice) { this.purchasePrice = purchasePrice; }

    public BigDecimal getSellingPrice() { return sellingPrice; }
    public void setSellingPrice(BigDecimal sellingPrice) { this.sellingPrice = sellingPrice; }

    public Integer getMinStockLevel() { return minStockLevel; }
    public void setMinStockLevel(Integer minStockLevel) { this.minStockLevel = minStockLevel; }

    public Integer getMaxStockLevel() { return maxStockLevel; }
    public void setMaxStockLevel(Integer maxStockLevel) { this.maxStockLevel = maxStockLevel; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
