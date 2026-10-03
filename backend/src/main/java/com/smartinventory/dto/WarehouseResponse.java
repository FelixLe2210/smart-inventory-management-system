package com.smartinventory.dto;

import com.smartinventory.model.Warehouse;
import java.time.LocalDateTime;

/** Response payload cho một chi nhánh kho — dùng trong list và detail. */
public class WarehouseResponse {

    private Long id;
    private String code;
    private String name;
    private String address;
    private String phone;
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
    public String getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
