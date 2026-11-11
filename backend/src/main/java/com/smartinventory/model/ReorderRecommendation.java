package com.smartinventory.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Ánh xạ bảng {@code reorder_recommendations} (đầu ra của AI #2). */
@Entity
@Table(name = "reorder_recommendations")
public class ReorderRecommendation {

    public static final String PENDING = "PENDING";
    public static final String ACCEPTED = "ACCEPTED";
    public static final String MODIFIED = "MODIFIED";
    public static final String REJECTED = "REJECTED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recommendation_code", nullable = false, unique = true, length = 50)
    private String recommendationCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @Column(name = "current_stock", nullable = false)
    private Integer currentStock;

    @Column(name = "incoming_stock", nullable = false)
    private Integer incomingStock = 0;

    @Column(name = "supplier_lead_time_days", nullable = false)
    private Integer supplierLeadTimeDays;

    @Column(name = "safety_stock", nullable = false)
    private Integer safetyStock;

    @Column(name = "reorder_point", nullable = false)
    private Integer reorderPoint;

    @Column(name = "recommended_order_qty", nullable = false)
    private Integer recommendedOrderQty;

    @Column(name = "suggested_order_date", nullable = false)
    private LocalDate suggestedOrderDate;

    /** LOW | MEDIUM | HIGH | CRITICAL */
    @Column(name = "urgency_level", nullable = false, length = 20)
    private String urgencyLevel = "MEDIUM";

    /** PENDING | ACCEPTED | MODIFIED | REJECTED */
    @Column(nullable = false, length = 20)
    private String status = PENDING;

    @Column(name = "purchase_order_id")
    private Long purchaseOrderId;

    @Column(name = "shortage_risk", length = 10)
    private String shortageRisk;

    @Column(name = "stockout_probability", precision = 5, scale = 4)
    private BigDecimal stockoutProbability;

    @Column(name = "avg_daily_demand", precision = 12, scale = 2)
    private BigDecimal avgDailyDemand;

    @Column(name = "expected_arrival_date")
    private LocalDate expectedArrivalDate;

    @Column(name = "details_json", columnDefinition = "NVARCHAR(MAX)")
    private String detailsJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PrePersist
    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getRecommendationCode() { return recommendationCode; }
    public void setRecommendationCode(String recommendationCode) { this.recommendationCode = recommendationCode; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public Warehouse getWarehouse() { return warehouse; }
    public void setWarehouse(Warehouse warehouse) { this.warehouse = warehouse; }
    public Integer getCurrentStock() { return currentStock; }
    public void setCurrentStock(Integer currentStock) { this.currentStock = currentStock; }
    public Integer getIncomingStock() { return incomingStock; }
    public void setIncomingStock(Integer incomingStock) { this.incomingStock = incomingStock; }
    public Integer getSupplierLeadTimeDays() { return supplierLeadTimeDays; }
    public void setSupplierLeadTimeDays(Integer supplierLeadTimeDays) { this.supplierLeadTimeDays = supplierLeadTimeDays; }
    public Integer getSafetyStock() { return safetyStock; }
    public void setSafetyStock(Integer safetyStock) { this.safetyStock = safetyStock; }
    public Integer getReorderPoint() { return reorderPoint; }
    public void setReorderPoint(Integer reorderPoint) { this.reorderPoint = reorderPoint; }
    public Integer getRecommendedOrderQty() { return recommendedOrderQty; }
    public void setRecommendedOrderQty(Integer recommendedOrderQty) { this.recommendedOrderQty = recommendedOrderQty; }
    public LocalDate getSuggestedOrderDate() { return suggestedOrderDate; }
    public void setSuggestedOrderDate(LocalDate suggestedOrderDate) { this.suggestedOrderDate = suggestedOrderDate; }
    public String getUrgencyLevel() { return urgencyLevel; }
    public void setUrgencyLevel(String urgencyLevel) { this.urgencyLevel = urgencyLevel; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Long getPurchaseOrderId() { return purchaseOrderId; }
    public void setPurchaseOrderId(Long purchaseOrderId) { this.purchaseOrderId = purchaseOrderId; }
    public String getShortageRisk() { return shortageRisk; }
    public void setShortageRisk(String shortageRisk) { this.shortageRisk = shortageRisk; }
    public BigDecimal getStockoutProbability() { return stockoutProbability; }
    public void setStockoutProbability(BigDecimal stockoutProbability) { this.stockoutProbability = stockoutProbability; }
    public BigDecimal getAvgDailyDemand() { return avgDailyDemand; }
    public void setAvgDailyDemand(BigDecimal avgDailyDemand) { this.avgDailyDemand = avgDailyDemand; }
    public LocalDate getExpectedArrivalDate() { return expectedArrivalDate; }
    public void setExpectedArrivalDate(LocalDate expectedArrivalDate) { this.expectedArrivalDate = expectedArrivalDate; }
    public String getDetailsJson() { return detailsJson; }
    public void setDetailsJson(String detailsJson) { this.detailsJson = detailsJson; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
