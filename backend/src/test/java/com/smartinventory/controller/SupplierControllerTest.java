package com.smartinventory.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartinventory.dto.SupplierRequest;
import com.smartinventory.dto.SupplierResponse;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.exception.NotFoundException;
import com.smartinventory.model.Supplier;
import com.smartinventory.security.JwtAuthenticationFilter;
import com.smartinventory.service.SupplierService;
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

@WebMvcTest(SupplierController.class)
@AutoConfigureMockMvc(addFilters = false)
class SupplierControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private SupplierService supplierService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    private Supplier sampleSupplier;
    private SupplierResponse sampleResponse;

    @BeforeEach
    void setUp() {
        sampleSupplier = new Supplier();
        sampleSupplier.setCode("SUP-SAMS01");
        sampleSupplier.setName("Samsung Electronics VN");
        sampleSupplier.setContactName("Kim Jin");
        sampleSupplier.setEmail("contact@samsung.vn");
        sampleSupplier.setPhone("0281234567");
        sampleSupplier.setLeadTimeDays(5);
        sampleSupplier.setReliabilityScore(new BigDecimal("0.98"));
        sampleSupplier.setStatus("ACTIVE");

        sampleResponse = SupplierResponse.from(sampleSupplier);
    }

    @Test
    @DisplayName("GET /api/suppliers - Returns list of suppliers")
    void getAllSuppliers_success() throws Exception {
        when(supplierService.getAllSuppliers()).thenReturn(List.of(sampleResponse));

        mockMvc.perform(get("/api/suppliers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].code").value("SUP-SAMS01"));
    }

    @Test
    @DisplayName("POST /api/suppliers - Returns 201 on valid supplier")
    void createSupplier_success() throws Exception {
        SupplierRequest request = new SupplierRequest();
        request.setCode("SUP-LG01");
        request.setName("LG Display VN");
        request.setEmail("sales@lg.vn");

        when(supplierService.createSupplier(any(SupplierRequest.class))).thenReturn(sampleResponse);

        mockMvc.perform(post("/api/suppliers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("POST /api/suppliers - Returns 400 when invalid email format")
    void createSupplier_invalidEmail() throws Exception {
        SupplierRequest request = new SupplierRequest();
        request.setCode("SUP-LG01");
        request.setName("LG Display VN");
        request.setEmail("not-an-email"); // invalid email!

        mockMvc.perform(post("/api/suppliers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("POST /api/suppliers - Returns 409 on duplicate supplier code")
    void createSupplier_duplicateConflict() throws Exception {
        SupplierRequest request = new SupplierRequest();
        request.setCode("SUP-SAMS01");
        request.setName("Samsung");

        when(supplierService.createSupplier(any(SupplierRequest.class)))
                .thenThrow(new ConflictException("DUPLICATE_SUPPLIER_CODE", "Mã NCC đã tồn tại"));

        mockMvc.perform(post("/api/suppliers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("DUPLICATE_SUPPLIER_CODE"));
    }

    @Test
    @DisplayName("DELETE /api/suppliers/{id} - Returns 200 on delete")
    void deleteSupplier_success() throws Exception {
        doNothing().when(supplierService).deleteSupplier(1L);

        mockMvc.perform(delete("/api/suppliers/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
