package com.smartinventory.dto;

import com.smartinventory.model.Warehouse;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Response payload cho một chi nhánh kho — dùng trong list và detail. */
public class WarehouseResponse {

    private Long id;
    private String code;
    private String name;
    private String address;
    private String phone;
    private String description;
    private String region;
    private String type;
    private BigDecimal area;
    private Integer capacity;
    private Integer used;
    private BigDecimal height;
    private Integer docks;
    private BigDecimal floorLoad;
    private String managerName;
    private String managerEmail;
    private String security;
    private boolean barcodeEnabled;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** Tạo WarehouseResponse từ entity Warehouse. */
    public static WarehouseResponse from(Warehouse w) {
        WarehouseResponse r = new WarehouseResponse();
        r.id = w.getId();
        r.code = w.getCode();
        r.name = w.getName();
        r.address = w.getAddress();
        r.phone = w.getPhone();
        r.description = w.getDescription();
        r.region = w.getRegion();
        r.type = w.getType();
        r.area = w.getArea();
        r.capacity = w.getCapacity();
        r.used = w.getUsed();
        r.height = w.getHeight();
        r.docks = w.getDocks();
        r.floorLoad = w.getFloorLoad();
        r.managerName = w.getManagerName();
        r.managerEmail = w.getManagerEmail();
        r.security = w.getSecurity();
        r.barcodeEnabled = w.isBarcodeEnabled();
        r.status = w.getStatus();
        r.createdAt = w.getCreatedAt();
        r.updatedAt = w.getUpdatedAt();
        return r;
    }

    // ── Getters ───────────────────────────────────────────────────────────

    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public String getAddress() { return address; }
    public String getPhone() { return phone; }
    public String getDescription() { return description; }
    public String getRegion() { return region; }
    public String getType() { return type; }
    public BigDecimal getArea() { return area; }
    public Integer getCapacity() { return capacity; }
    public Integer getUsed() { return used; }
    public BigDecimal getHeight() { return height; }
    public Integer getDocks() { return docks; }
    public BigDecimal getFloorLoad() { return floorLoad; }
    public String getManagerName() { return managerName; }
    public String getManagerEmail() { return managerEmail; }
    public String getSecurity() { return security; }
    public boolean isBarcodeEnabled() { return barcodeEnabled; }
    public String getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
