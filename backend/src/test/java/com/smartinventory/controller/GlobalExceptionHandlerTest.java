package com.smartinventory.controller;

import com.smartinventory.dto.WarehouseRequest;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.exception.NotFoundException;
import com.smartinventory.security.JwtAuthenticationFilter;
import com.smartinventory.service.WarehouseService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(WarehouseController.class)
@AutoConfigureMockMvc(addFilters = false)
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private WarehouseService warehouseService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    @DisplayName("Malformed JSON body returns 400 MALFORMED_REQUEST")
    void testMalformedJson() throws Exception {
        mockMvc.perform(post("/api/warehouses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{invalid-json-body}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("MALFORMED_REQUEST"));
    }

    @Test
    @DisplayName("Type mismatch in URL parameter returns 400 BAD_REQUEST")
    void testTypeMismatch() throws Exception {
        mockMvc.perform(get("/api/warehouses/abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("BAD_REQUEST"));
    }

    @Test
    @DisplayName("NotFoundException returns 404 with error code")
    void testNotFound() throws Exception {
        when(warehouseService.getWarehouseById(999L))
                .thenThrow(new NotFoundException("WAREHOUSE_NOT_FOUND", "Kho không tồn tại"));

        mockMvc.perform(get("/api/warehouses/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("WAREHOUSE_NOT_FOUND"));
    }

    @Test
    @DisplayName("ConflictException returns 409 with error code")
    void testConflict() throws Exception {
        when(warehouseService.createWarehouse(any(WarehouseRequest.class)))
                .thenThrow(new ConflictException("DUPLICATE_CODE", "Mã đã tồn tại"));

        WarehouseRequest req = new WarehouseRequest();
        req.setCode("KHO-TEST");
        req.setName("Kho Test");
        req.setAddress("Hà Nội");

        mockMvc.perform(post("/api/warehouses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"KHO-TEST\",\"name\":\"Kho Test\",\"address\":\"Hà Nội\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("DUPLICATE_CODE"));
    }
}
