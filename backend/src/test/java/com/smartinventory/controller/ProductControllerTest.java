package com.smartinventory.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartinventory.dto.ProductRequest;
import com.smartinventory.dto.ProductResponse;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.exception.NotFoundException;
import com.smartinventory.model.Category;
import com.smartinventory.model.Product;
import com.smartinventory.model.Supplier;
import com.smartinventory.security.JwtAuthenticationFilter;
import com.smartinventory.service.ProductService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProductController.class)
@AutoConfigureMockMvc(addFilters = false)
class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ProductService productService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    private Product sampleProduct;
    private ProductResponse sampleResponse;

    @BeforeEach
    void setUp() {
        Category cat = new Category();
        cat.setCode("CAT-ELEC");
        cat.setName("Điện tử");

        Supplier sup = new Supplier();
        sup.setCode("SUP-SAM");
        sup.setName("Samsung");

        sampleProduct = new Product();
        sampleProduct.setSku("PRD-IP15-128");
        sampleProduct.setBarcode("8938501234567");
        sampleProduct.setName("iPhone 15 128GB");
        sampleProduct.setCategory(cat);
        sampleProduct.setSupplier(sup);
        sampleProduct.setUnit("Cái");
        sampleProduct.setPurchasePrice(new BigDecimal("18500000"));
        sampleProduct.setSellingPrice(new BigDecimal("21990000"));
        sampleProduct.setMinStockLevel(5);
        sampleProduct.setMaxStockLevel(100);
        sampleProduct.setStatus("ACTIVE");

        sampleResponse = ProductResponse.from(sampleProduct);
    }

    @Test
    @DisplayName("GET /api/products - Returns list of products")
    void getAllProducts_success() throws Exception {
        when(productService.getAllProducts()).thenReturn(List.of(sampleResponse));

        mockMvc.perform(get("/api/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].sku").value("PRD-IP15-128"));
    }

    @Test
    @DisplayName("POST /api/products - Returns 201 when valid product request")
    void createProduct_success() throws Exception {
        ProductRequest request = new ProductRequest();
        request.setSku("PRD-SAM-S24");
        request.setBarcode("8938507654321");
        request.setName("Samsung Galaxy S24");
        request.setCategoryId(1L);
        request.setSupplierId(1L);
        request.setPurchasePrice(new BigDecimal("16000000"));
        request.setSellingPrice(new BigDecimal("19500000"));
        request.setMinStockLevel(5);
        request.setMaxStockLevel(200);

        when(productService.createProduct(any(ProductRequest.class))).thenReturn(sampleResponse);

        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("POST /api/products - Returns 400 when missing required categoryId")
    void createProduct_missingCategoryId() throws Exception {
        ProductRequest request = new ProductRequest();
        request.setSku("PRD-SAM-S24");
        request.setBarcode("8938507654321");
        request.setName("Samsung Galaxy S24");
        request.setCategoryId(null); // required!
        request.setPurchasePrice(new BigDecimal("16000000"));
        request.setSellingPrice(new BigDecimal("19500000"));

        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("POST /api/products - Returns 409 when SKU already exists")
    void createProduct_duplicateSku() throws Exception {
        ProductRequest request = new ProductRequest();
        request.setSku("PRD-IP15-128");
        request.setBarcode("8938507654321");
        request.setName("iPhone 15");
        request.setCategoryId(1L);
        request.setPurchasePrice(new BigDecimal("18500000"));
        request.setSellingPrice(new BigDecimal("21990000"));

        when(productService.createProduct(any(ProductRequest.class)))
                .thenThrow(new ConflictException("DUPLICATE_SKU", "Mã SKU đã tồn tại"));

        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("DUPLICATE_SKU"));
    }

    @Test
    @DisplayName("DELETE /api/products/{id} - Returns 200 on delete")
    void deleteProduct_success() throws Exception {
        doNothing().when(productService).deleteProduct(1L);

        mockMvc.perform(delete("/api/products/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
