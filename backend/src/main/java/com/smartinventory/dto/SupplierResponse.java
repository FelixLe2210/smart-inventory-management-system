package com.smartinventory.dto;

import com.smartinventory.model.Supplier;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Response payload cho một nhà cung cấp. */
public class SupplierResponse {

    private Long id;
    private String code;
    private String name;
    private String contactName;
    private String email;
    private String phone;
    private String address;
    private Integer leadTimeDays;
    private BigDecimal reliabilityScore;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static SupplierResponse from(Supplier s) {
        SupplierResponse r = new SupplierResponse();
        r.id = s.getId();
        r.code = s.getCode();
        r.name = s.getName();
        r.contactName = s.getContactName();
        r.email = s.getEmail();
        r.phone = s.getPhone();
        r.address = s.getAddress();
        r.leadTimeDays = s.getLeadTimeDays();
        r.reliabilityScore = s.getReliabilityScore();
        r.status = s.getStatus();
        r.createdAt = s.getCreatedAt();
        r.updatedAt = s.getUpdatedAt();
        return r;
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public String getContactName() { return contactName; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getAddress() { return address; }
    public Integer getLeadTimeDays() { return leadTimeDays; }
    public BigDecimal getReliabilityScore() { return reliabilityScore; }
    public String getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
