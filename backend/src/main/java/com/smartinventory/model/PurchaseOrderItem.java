package com.smartinventory.model;

import jakarta.persistence.*;

import java.math.BigDecimal;

/** Ánh xạ bảng {@code purchase_order_items}. */
@Entity
@Table(name = "purchase_order_items")
public class PurchaseOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "ordered_qty", nullable = false)
    private Integer orderedQty;

    @Column(name = "received_qty", nullable = false)
    private Integer receivedQty = 0;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice = BigDecimal.ZERO;

    @Column(name = "total_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalPrice = BigDecimal.ZERO;

    protected PurchaseOrderItem() {
    }

    public PurchaseOrderItem(Product product, int orderedQty, BigDecimal unitPrice) {
        this.product = product;
        this.orderedQty = orderedQty;
        this.unitPrice = unitPrice;
        this.totalPrice = unitPrice.multiply(BigDecimal.valueOf(orderedQty));
    }

    public int getRemainingQty() {
        return Math.max(0, orderedQty - (receivedQty == null ? 0 : receivedQty));
    }

    public void addReceived(int quantity) {
        this.receivedQty = (receivedQty == null ? 0 : receivedQty) + quantity;
    }

    public Long getId() { return id; }
    public PurchaseOrder getPurchaseOrder() { return purchaseOrder; }
    public void setPurchaseOrder(PurchaseOrder purchaseOrder) { this.purchaseOrder = purchaseOrder; }
    public Product getProduct() { return product; }
    public Integer getOrderedQty() { return orderedQty; }
    public Integer getReceivedQty() { return receivedQty; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public BigDecimal getTotalPrice() { return totalPrice; }
}
