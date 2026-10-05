package com.smartinventory.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

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

    @Size(max = 255, message = "Mô tả không quá 255 ký tự")
    private String description;

    @NotBlank(message = "Khu vực không được để trống")
    @Pattern(regexp = "^(north|central|south)$", message = "Khu vực không hợp lệ")
    private String region = "north";

    @NotBlank(message = "Loại kho không được để trống")
    @Pattern(regexp = "^(standard|cold|crossdock|fulfillment)$", message = "Loại kho không hợp lệ")
    private String type = "standard";

    @DecimalMin(value = "0.00", message = "Diện tích không được âm")
    @Digits(integer = 10, fraction = 2, message = "Diện tích tối đa 10 chữ số nguyên và 2 chữ số thập phân")
    private BigDecimal area;

    @Min(value = 0, message = "Sức chứa không được âm")
    private Integer capacity = 0;

    @DecimalMin(value = "0.00", message = "Chiều cao không được âm")
    @Digits(integer = 4, fraction = 2, message = "Chiều cao tối đa 4 chữ số nguyên và 2 chữ số thập phân")
    private BigDecimal height;

    @Min(value = 0, message = "Số cửa xuất nhập không được âm")
    private Integer docks;

    @DecimalMin(value = "0.00", message = "Tải trọng sàn không được âm")
    @Digits(integer = 4, fraction = 2, message = "Tải trọng sàn tối đa 4 chữ số nguyên và 2 chữ số thập phân")
    private BigDecimal floorLoad;

    @Size(max = 100, message = "Tên người quản lý không quá 100 ký tự")
    private String managerName;

    @Email(message = "Email quản lý không hợp lệ")
    @Size(max = 100, message = "Email quản lý không quá 100 ký tự")
    private String managerEmail;

    @Size(max = 100, message = "Thông tin an ninh không quá 100 ký tự")
    private String security;

    @NotNull(message = "Cấu hình Barcode không được để trống")
    private Boolean barcodeEnabled = true;

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

    public Boolean getBarcodeEnabled() { return barcodeEnabled; }
    public void setBarcodeEnabled(Boolean barcodeEnabled) { this.barcodeEnabled = barcodeEnabled; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
