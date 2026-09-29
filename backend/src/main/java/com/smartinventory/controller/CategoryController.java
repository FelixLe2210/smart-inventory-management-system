package com.smartinventory.controller;

import com.smartinventory.dto.ApiResponse;
import com.smartinventory.dto.CategoryRequest;
import com.smartinventory.dto.CategoryResponse;
import com.smartinventory.service.CategoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    public ApiResponse<List<CategoryResponse>> getAllCategories() {
        return ApiResponse.success(categoryService.getAllCategories());
    }

    @GetMapping("/{id}")
    public ApiResponse<CategoryResponse> getCategoryById(@PathVariable Long id) {
        return ApiResponse.success(categoryService.getCategoryById(id));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(@Valid @RequestBody CategoryRequest request) {
        CategoryResponse created = categoryService.createCategory(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    @PutMapping("/{id}")
    public ApiResponse<CategoryResponse> updateCategory(@PathVariable Long id,
                                                       @Valid @RequestBody CategoryRequest request) {
        CategoryResponse updated = categoryService.updateCategory(id, request);
        return ApiResponse.success(updated);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ApiResponse.success(null);
    }
}
