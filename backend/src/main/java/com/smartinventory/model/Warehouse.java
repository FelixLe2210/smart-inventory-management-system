package com.smartinventory.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Ánh xạ bảng {@code warehouses} trong database.
 * Trạng thái hợp lệ: ACTIVE | INACTIVE | MAINTENANCE
 */
@Entity
@Table(name = "warehouses")
public class Warehouse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(length = 20)
    private String phone;

    @Column(length = 255)
    private String description;

    @Column(nullable = false, length = 20)
    private String region = "north";

    @Column(name = "warehouse_type", nullable = false, length = 20)
    private String type = "standard";

    @Column(name = "area_sqm", precision = 12, scale = 2)
    private BigDecimal area;

    @Column(name = "capacity_pallets", nullable = false)
    private Integer capacity = 0;

    @Column(name = "used_pallets", nullable = false)
    private Integer used = 0;

    @Column(name = "ceiling_height_m", precision = 6, scale = 2)
    private BigDecimal height;

    @Column(name = "dock_count")
    private Integer docks;

    @Column(name = "floor_load_tons_per_sqm", precision = 6, scale = 2)
    private BigDecimal floorLoad;

    @Column(name = "manager_name", length = 100)
    private String managerName;

    @Column(name = "manager_email", length = 100)
    private String managerEmail;

    @Column(name = "security_contact", length = 100)
    private String security;

    @Column(name = "barcode_enabled", nullable = false)
    private boolean barcodeEnabled = true;

    /** ACTIVE | INACTIVE | MAINTENANCE */
    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // ── Getters & Setters ─────────────────────────────────────────────────

    public Long getId() { return id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public BigDecimal getArea() { return area; }
    public void setArea(BigDecimal area) { this.area = area; }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public Integer getUsed() { return used; }
    public void setUsed(Integer used) { this.used = used; }

    public BigDecimal getHeight() { return height; }
    public void setHeight(BigDecimal height) { this.height = height; }

    public Integer getDocks() { return docks; }
    public void setDocks(Integer docks) { this.docks = docks; }

    public BigDecimal getFloorLoad() { return floorLoad; }
    public void setFloorLoad(BigDecimal floorLoad) { this.floorLoad = floorLoad; }

    public String getManagerName() { return managerName; }
    public void setManagerName(String managerName) { this.managerName = managerName; }

    public String getManagerEmail() { return managerEmail; }
    public void setManagerEmail(String managerEmail) { this.managerEmail = managerEmail; }

    public String getSecurity() { return security; }
    public void setSecurity(String security) { this.security = security; }

    public boolean isBarcodeEnabled() { return barcodeEnabled; }
    public void setBarcodeEnabled(boolean barcodeEnabled) { this.barcodeEnabled = barcodeEnabled; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
