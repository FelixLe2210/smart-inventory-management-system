package com.smartinventory.service;

import com.smartinventory.dto.CategoryRequest;
import com.smartinventory.dto.CategoryResponse;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.exception.NotFoundException;
import com.smartinventory.model.Category;
import com.smartinventory.repository.CategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(CategoryResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CategoryResponse getCategoryById(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("CATEGORY_NOT_FOUND", "Không tìm thấy danh mục với ID: " + id));
        return CategoryResponse.from(category);
    }

    public CategoryResponse createCategory(CategoryRequest request) {
        if (categoryRepository.existsByCode(request.getCode())) {
            throw new ConflictException("DUPLICATE_CATEGORY_CODE", "Mã danh mục đã tồn tại: " + request.getCode());
        }

        Category category = new Category();
        category.setCode(request.getCode().toUpperCase().trim());
        category.setName(request.getName().trim());
        category.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);

        Category saved = categoryRepository.save(category);
        return CategoryResponse.from(saved);
    }

    public CategoryResponse updateCategory(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("CATEGORY_NOT_FOUND", "Không tìm thấy danh mục với ID: " + id));

        if (categoryRepository.existsByCodeAndIdNot(request.getCode(), id)) {
            throw new ConflictException("DUPLICATE_CATEGORY_CODE", "Mã danh mục đã tồn tại ở bản ghi khác: " + request.getCode());
        }

        category.setCode(request.getCode().toUpperCase().trim());
        category.setName(request.getName().trim());
        category.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);

        Category updated = categoryRepository.save(category);
        return CategoryResponse.from(updated);
    }

    public void deleteCategory(Long id) {
        if (!categoryRepository.existsById(id)) {
            throw new NotFoundException("CATEGORY_NOT_FOUND", "Không tìm thấy danh mục với ID: " + id);
        }
        categoryRepository.deleteById(id);
    }
}
