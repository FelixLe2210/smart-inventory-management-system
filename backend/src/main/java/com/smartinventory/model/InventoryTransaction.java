package com.smartinventory.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_transactions")
public class InventoryTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_code", nullable = false, unique = true, length = 50)
    private String transactionCode;

    @Column(name = "transaction_type", nullable = false, length = 30)
    private String transactionType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_warehouse_id")
    private Warehouse sourceWarehouse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_warehouse_id")
    private Warehouse destinationWarehouse;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "balance_before", nullable = false)
    private Integer balanceBefore;

    @Column(name = "balance_after", nullable = false)
    private Integer balanceAfter;

    @Column(name = "reference_doc", length = 50)
    private String referenceDoc;

    @Column(length = 255)
    private String reason;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    protected InventoryTransaction() {
    }

    public InventoryTransaction(String transactionCode, String transactionType, Product product,
                                Warehouse sourceWarehouse, Warehouse destinationWarehouse, int quantity,
                                int balanceBefore, int balanceAfter, String referenceDoc, String reason,
                                User createdBy) {
        this.transactionCode = transactionCode;
        this.transactionType = transactionType;
        this.product = product;
        this.sourceWarehouse = sourceWarehouse;
        this.destinationWarehouse = destinationWarehouse;
        this.quantity = quantity;
        this.balanceBefore = balanceBefore;
        this.balanceAfter = balanceAfter;
        this.referenceDoc = referenceDoc;
        this.reason = reason;
        this.createdBy = createdBy;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getTransactionCode() { return transactionCode; }
    public String getTransactionType() { return transactionType; }
    public Product getProduct() { return product; }
    public Warehouse getSourceWarehouse() { return sourceWarehouse; }
    public Warehouse getDestinationWarehouse() { return destinationWarehouse; }
    public Integer getQuantity() { return quantity; }
    public Integer getBalanceBefore() { return balanceBefore; }
    public Integer getBalanceAfter() { return balanceAfter; }
    public String getReferenceDoc() { return referenceDoc; }
    public String getReason() { return reason; }
    public User getCreatedBy() { return createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
