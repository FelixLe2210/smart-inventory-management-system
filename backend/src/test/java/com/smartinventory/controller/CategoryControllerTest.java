package com.smartinventory.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartinventory.dto.CategoryRequest;
import com.smartinventory.dto.CategoryResponse;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.exception.NotFoundException;
import com.smartinventory.model.Category;
import com.smartinventory.service.CategoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CategoryController.class)
class CategoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CategoryService categoryService;

    private Category sampleCategory;
    private CategoryResponse sampleResponse;

    @BeforeEach
    void setUp() {
        sampleCategory = new Category();
        sampleCategory.setCode("CAT-ELEC");
        sampleCategory.setName("Thiết bị điện tử");
        sampleCategory.setDescription("Linh kiện, bo mạch, thiết bị viễn thông");

        sampleResponse = CategoryResponse.from(sampleCategory);
    }

    @Test
    @DisplayName("GET /api/categories - Returns list of categories")
    void getAllCategories_success() throws Exception {
        when(categoryService.getAllCategories()).thenReturn(List.of(sampleResponse));

        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].code").value("CAT-ELEC"));
    }

    @Test
    @DisplayName("POST /api/categories - Returns 201 on valid creation")
    void createCategory_success() throws Exception {
        CategoryRequest request = new CategoryRequest();
        request.setCode("CAT-MECH");
        request.setName("Cơ khí chính xác");

        when(categoryService.createCategory(any(CategoryRequest.class))).thenReturn(sampleResponse);

        mockMvc.perform(post("/api/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("POST /api/categories - Returns 400 when code is empty")
    void createCategory_validationError() throws Exception {
        CategoryRequest request = new CategoryRequest();
        request.setCode("");
        request.setName("Hàng tiêu dùng");

        mockMvc.perform(post("/api/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("POST /api/categories - Returns 409 when code already exists")
    void createCategory_duplicateConflict() throws Exception {
        CategoryRequest request = new CategoryRequest();
        request.setCode("CAT-ELEC");
        request.setName("Thiết bị điện tử trùng lặp");

        when(categoryService.createCategory(any(CategoryRequest.class)))
                .thenThrow(new ConflictException("DUPLICATE_CATEGORY_CODE", "Mã danh mục đã tồn tại"));

        mockMvc.perform(post("/api/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("DUPLICATE_CATEGORY_CODE"));
    }

    @Test
    @DisplayName("DELETE /api/categories/{id} - Returns 200 on delete")
    void deleteCategory_success() throws Exception {
        doNothing().when(categoryService).deleteCategory(1L);

        mockMvc.perform(delete("/api/categories/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
