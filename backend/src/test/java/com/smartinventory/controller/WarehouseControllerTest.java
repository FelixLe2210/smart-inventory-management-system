package com.smartinventory.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartinventory.dto.WarehouseRequest;
import com.smartinventory.dto.WarehouseResponse;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.exception.NotFoundException;
import com.smartinventory.model.Warehouse;
import com.smartinventory.security.JwtAuthenticationFilter;
import com.smartinventory.service.WarehouseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(WarehouseController.class)
@AutoConfigureMockMvc(addFilters = false)
class WarehouseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private WarehouseService warehouseService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    private Warehouse sampleWarehouse;
    private WarehouseResponse sampleResponse;

    @BeforeEach
    void setUp() {
        sampleWarehouse = new Warehouse();
        sampleWarehouse.setCode("KHO-SGN01");
        sampleWarehouse.setName("Kho Logistics Tân Tạo");
        sampleWarehouse.setAddress("Lô 12, KCN Tân Tạo, TP.HCM");
        sampleWarehouse.setPhone("0908123456");
        sampleWarehouse.setStatus("ACTIVE");

        sampleResponse = WarehouseResponse.from(sampleWarehouse);
    }

    @Test
    @DisplayName("GET /api/warehouses - Returns 200 and list of warehouses")
    void getAllWarehouses_success() throws Exception {
        when(warehouseService.getAllWarehouses()).thenReturn(List.of(sampleResponse));

        mockMvc.perform(get("/api/warehouses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].code").value("KHO-SGN01"))
                .andExpect(jsonPath("$.data[0].name").value("Kho Logistics Tân Tạo"));

        verify(warehouseService, times(1)).getAllWarehouses();
    }

    @Test
    @DisplayName("GET /api/warehouses/{id} - Returns 200 when found")
    void getWarehouseById_success() throws Exception {
        when(warehouseService.getWarehouseById(1L)).thenReturn(sampleResponse);

        mockMvc.perform(get("/api/warehouses/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.code").value("KHO-SGN01"));
    }

    @Test
    @DisplayName("GET /api/warehouses/{id} - Returns 404 when not found")
    void getWarehouseById_notFound() throws Exception {
        when(warehouseService.getWarehouseById(99L))
                .thenThrow(new NotFoundException("WAREHOUSE_NOT_FOUND", "Không tìm thấy kho"));

        mockMvc.perform(get("/api/warehouses/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("WAREHOUSE_NOT_FOUND"));
    }

    @Test
    @DisplayName("POST /api/warehouses - Returns 201 when valid request")
    void createWarehouse_success() throws Exception {
        WarehouseRequest request = new WarehouseRequest();
        request.setCode("KHO-HAN01");
        request.setName("Kho Hà Nội Mê Linh");
        request.setAddress("KCN Quang Minh, Hà Nội");
        request.setPhone("0912345678");
        request.setStatus("ACTIVE");

        when(warehouseService.createWarehouse(any(WarehouseRequest.class))).thenReturn(sampleResponse);

        mockMvc.perform(post("/api/warehouses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("POST /api/warehouses - Returns 400 when validation fails (empty code or blank name)")
    void createWarehouse_validationError() throws Exception {
        WarehouseRequest request = new WarehouseRequest();
        request.setCode(""); // blank!
        request.setName(""); // blank!
        request.setAddress("");

        mockMvc.perform(post("/api/warehouses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("POST /api/warehouses - Returns 409 when warehouse code already exists")
    void createWarehouse_duplicateConflict() throws Exception {
        WarehouseRequest request = new WarehouseRequest();
        request.setCode("KHO-SGN01");
        request.setName("Kho Tân Tạo");
        request.setAddress("KCN Tân Tạo, TP.HCM");

        when(warehouseService.createWarehouse(any(WarehouseRequest.class)))
                .thenThrow(new ConflictException("DUPLICATE_WAREHOUSE_CODE", "Mã kho đã tồn tại"));

        mockMvc.perform(post("/api/warehouses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("DUPLICATE_WAREHOUSE_CODE"));
    }

    @Test
    @DisplayName("PUT /api/warehouses/{id} - Returns 200 when updated")
    void updateWarehouse_success() throws Exception {
        WarehouseRequest request = new WarehouseRequest();
        request.setCode("KHO-SGN01");
        request.setName("Kho Tân Tạo Cập Nhật");
        request.setAddress("Lô 12, KCN Tân Tạo mới");

        when(warehouseService.updateWarehouse(eq(1L), any(WarehouseRequest.class))).thenReturn(sampleResponse);

        mockMvc.perform(put("/api/warehouses/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("PATCH /api/warehouses/{id}/status - Returns 200 on status change")
    void updateStatus_success() throws Exception {
        when(warehouseService.updateStatus(eq(1L), eq("INACTIVE"))).thenReturn(sampleResponse);

        mockMvc.perform(patch("/api/warehouses/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "INACTIVE"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("DELETE /api/warehouses/{id} - Returns 200 on delete")
    void deleteWarehouse_success() throws Exception {
        doNothing().when(warehouseService).deleteWarehouse(1L);

        mockMvc.perform(delete("/api/warehouses/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(warehouseService, times(1)).deleteWarehouse(1L);
    }
}
