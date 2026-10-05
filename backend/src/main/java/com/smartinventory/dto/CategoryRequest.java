package com.smartinventory.dto;

import jakarta.validation.constraints.*;

/** Request body cho POST /api/categories và PUT /api/categories/{id}. */
public class CategoryRequest {

    @NotBlank(message = "Mã danh mục không được để trống")
    @Size(min = 2, max = 30, message = "Mã danh mục phải từ 2 đến 30 ký tự")
    @Pattern(regexp = "^[A-Z0-9-_]+$", message = "Mã danh mục chỉ được chứa chữ in hoa, số, gạch ngang, gạch dưới")
    private String code;

    @NotBlank(message = "Tên danh mục không được để trống")
    @Size(max = 100, message = "Tên danh mục không quá 100 ký tự")
    private String name;

    @Size(max = 255, message = "Mô tả không quá 255 ký tự")
    private String description;

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
