package com.smartinventory.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Ánh xạ bảng {@code purchase_orders}.
 * Trạng thái: DRAFT -> SENT -> PARTIALLY_RECEIVED -> RECEIVED, hoặc CANCELLED.
 */
@Entity
@Table(name = "purchase_orders")
public class PurchaseOrder {

    public static final String DRAFT = "DRAFT";
    public static final String SENT = "SENT";
    public static final String PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED";
    public static final String RECEIVED = "RECEIVED";
    public static final String CANCELLED = "CANCELLED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "po_number", nullable = false, unique = true, length = 50)
    private String poNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "destination_warehouse_id", nullable = false)
    private Warehouse destinationWarehouse;

    @Column(nullable = false, length = 30)
    private String status = DRAFT;

    @Column(name = "order_date", nullable = false)
    private LocalDateTime orderDate = LocalDateTime.now();

    @Column(name = "expected_delivery_date")
    private LocalDate expectedDeliveryDate;

    @Column(name = "actual_delivery_date")
    private LocalDate actualDeliveryDate;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String note;

    @Column(name = "ai_recommendation_id")
    private Long aiRecommendationId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PurchaseOrderItem> items = new ArrayList<>();

    @PrePersist
    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void addItem(PurchaseOrderItem item) {
        item.setPurchaseOrder(this);
        items.add(item);
    }

    /** Tổng tiền = tổng thành tiền các dòng. */
    public void recalculateTotal() {
        BigDecimal sum = BigDecimal.ZERO;
        for (PurchaseOrderItem item : items) {
            sum = sum.add(item.getTotalPrice());
        }
        this.totalAmount = sum;
    }

    public boolean hasAnyReceivedQuantity() {
        return items.stream().anyMatch(i -> i.getReceivedQty() != null && i.getReceivedQty() > 0);
    }

    public boolean isFullyReceived() {
        return !items.isEmpty() && items.stream().allMatch(i -> i.getRemainingQty() <= 0);
    }

    public Long getId() { return id; }
    public String getPoNumber() { return poNumber; }
    public void setPoNumber(String poNumber) { this.poNumber = poNumber; }
    public Supplier getSupplier() { return supplier; }
    public void setSupplier(Supplier supplier) { this.supplier = supplier; }
    public Warehouse getDestinationWarehouse() { return destinationWarehouse; }
    public void setDestinationWarehouse(Warehouse destinationWarehouse) { this.destinationWarehouse = destinationWarehouse; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getOrderDate() { return orderDate; }
    public void setOrderDate(LocalDateTime orderDate) { this.orderDate = orderDate; }
    public LocalDate getExpectedDeliveryDate() { return expectedDeliveryDate; }
    public void setExpectedDeliveryDate(LocalDate expectedDeliveryDate) { this.expectedDeliveryDate = expectedDeliveryDate; }
    public LocalDate getActualDeliveryDate() { return actualDeliveryDate; }
    public void setActualDeliveryDate(LocalDate actualDeliveryDate) { this.actualDeliveryDate = actualDeliveryDate; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public Long getAiRecommendationId() { return aiRecommendationId; }
    public void setAiRecommendationId(Long aiRecommendationId) { this.aiRecommendationId = aiRecommendationId; }
    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
    public User getApprovedBy() { return approvedBy; }
    public void setApprovedBy(User approvedBy) { this.approvedBy = approvedBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public List<PurchaseOrderItem> getItems() { return items; }
}
