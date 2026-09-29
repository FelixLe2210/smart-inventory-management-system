package com.smartinventory.dto;

import jakarta.validation.constraints.*;

/**
 * Request body cho POST /api/warehouses và PUT /api/warehouses/{id}.
 * Tất cả trường đều có validation annotation để GlobalExceptionHandler tự bắt lỗi.
 */
public class WarehouseRequest {

    @NotBlank(message = "Mã kho không được để trống")
    @Size(min = 3, max = 20, message = "Mã kho phải từ 3 đến 20 ký tự")
    @Pattern(regexp = "^[A-Z0-9-]+$", message = "Mã kho chỉ được chứa chữ in hoa, số và dấu gạch ngang")
    private String code;

    @NotBlank(message = "Tên kho không được để trống")
    @Size(max = 100, message = "Tên kho không quá 100 ký tự")
    private String name;

    @NotBlank(message = "Địa chỉ không được để trống")
    @Size(max = 255, message = "Địa chỉ không quá 255 ký tự")
    private String address;

    @Size(max = 20, message = "Số điện thoại không quá 20 ký tự")
    private String phone;

    @Pattern(regexp = "^(ACTIVE|INACTIVE|MAINTENANCE)$", message = "Trạng thái phải là ACTIVE, INACTIVE hoặc MAINTENANCE")
    private String status = "ACTIVE";

    // ── Getters & Setters ─────────────────────────────────────────────────

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
