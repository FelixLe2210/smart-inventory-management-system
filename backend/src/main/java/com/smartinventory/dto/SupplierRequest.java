package com.smartinventory.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

/** Request body cho POST/PUT /api/suppliers. */
public class SupplierRequest {

    @NotBlank(message = "Mã nhà cung cấp không được để trống")
    @Size(min = 2, max = 30, message = "Mã nhà cung cấp phải từ 2 đến 30 ký tự")
    @Pattern(regexp = "^[A-Z0-9-_]+$", message = "Mã nhà cung cấp chỉ được chứa chữ in hoa, số, gạch ngang, gạch dưới")
    private String code;

    @NotBlank(message = "Tên nhà cung cấp không được để trống")
    @Size(max = 150, message = "Tên nhà cung cấp không quá 150 ký tự")
    private String name;

    @Size(max = 100, message = "Tên liên hệ không quá 100 ký tự")
    private String contactName;

    @Email(message = "Email không hợp lệ")
    @Size(max = 100, message = "Email không quá 100 ký tự")
    private String email;

    @Size(max = 20, message = "Số điện thoại không quá 20 ký tự")
    private String phone;

    @Size(max = 255, message = "Địa chỉ không quá 255 ký tự")
    private String address;

    @Min(value = 1, message = "Thời gian giao hàng tối thiểu 1 ngày")
    @Max(value = 365, message = "Thời gian giao hàng tối đa 365 ngày")
    private Integer leadTimeDays = 7;

    @DecimalMin(value = "0.00", message = "Điểm độ tin cậy không được âm")
    @DecimalMax(value = "1.00", message = "Điểm độ tin cậy tối đa là 1.00")
    private BigDecimal reliabilityScore = BigDecimal.ONE;

    @Pattern(regexp = "^(ACTIVE|INACTIVE)$", message = "Trạng thái phải là ACTIVE hoặc INACTIVE")
    private String status = "ACTIVE";

    // ── Getters & Setters ─────────────────────────────────────────────────

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getContactName() { return contactName; }
    public void setContactName(String contactName) { this.contactName = contactName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Integer getLeadTimeDays() { return leadTimeDays; }
    public void setLeadTimeDays(Integer leadTimeDays) { this.leadTimeDays = leadTimeDays; }

    public BigDecimal getReliabilityScore() { return reliabilityScore; }
    public void setReliabilityScore(BigDecimal reliabilityScore) { this.reliabilityScore = reliabilityScore; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
