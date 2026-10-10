package com.smartinventory.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartinventory.dto.InventoryAdjustRequest;
import com.smartinventory.dto.InventoryCreateRequest;
import com.smartinventory.dto.InventoryResponse;
import com.smartinventory.dto.InventoryUpdateRequest;
import com.smartinventory.exception.BadRequestException;
import com.smartinventory.exception.NotFoundException;
import com.smartinventory.service.InventoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(InventoryController.class)
@AutoConfigureMockMvc(addFilters = false)
class InventoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private InventoryService inventoryService;

    private InventoryResponse sampleResponse;

    @BeforeEach
    void setUp() {
        sampleResponse = new InventoryResponse(
                1L,
                10L,
                "SP-CPU-I7",
                "Intel Core i7 14700K",
                "893000000010",
                "Hộp",
                10,
                100,
                20L,
                "KHO-SGN01",
                "Kho Tổng Sài Gòn",
                50,
                10,
                40,
                "Kệ A1-02",
                "IN_STOCK",
                LocalDateTime.now(),
                LocalDateTime.now()
        );
    }

    @Test
    @DisplayName("GET /api/inventories - Trả về danh sách tồn kho")
    void getAllInventories_ReturnsList() throws Exception {
        when(inventoryService.getAllInventories(null, null, null)).thenReturn(List.of(sampleResponse));

        mockMvc.perform(get("/api/inventories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(1L))
                .andExpect(jsonPath("$.data[0].productSku").value("SP-CPU-I7"))
                .andExpect(jsonPath("$.data[0].currentStock").value(50))
                .andExpect(jsonPath("$.data[0].availableStock").value(40));
    }

    @Test
    @DisplayName("GET /api/inventories/{id} - Trả về chi tiết khi tồn tại")
    void getInventoryById_Found() throws Exception {
        when(inventoryService.getInventoryById(1L)).thenReturn(sampleResponse);

        mockMvc.perform(get("/api/inventories/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1L))
                .andExpect(jsonPath("$.data.warehouseCode").value("KHO-SGN01"));
    }

    @Test
    @DisplayName("GET /api/inventories/{id} - Trả về 404 khi không tìm thấy")
    void getInventoryById_NotFound() throws Exception {
        when(inventoryService.getInventoryById(999L))
                .thenThrow(new NotFoundException("INVENTORY_NOT_FOUND", "Không tìm thấy"));

        mockMvc.perform(get("/api/inventories/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("INVENTORY_NOT_FOUND"));
    }

    @Test
    @DisplayName("POST /api/inventories - Tạo mới thành công trả về 201 Created")
    void createInventory_Success() throws Exception {
        InventoryCreateRequest request = new InventoryCreateRequest(10L, 20L, 50, 10, "Kệ A1-02");
        when(inventoryService.createInventory(any(InventoryCreateRequest.class))).thenReturn(sampleResponse);

        mockMvc.perform(post("/api/inventories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1L));
    }

    @Test
    @DisplayName("POST /api/inventories - Báo lỗi 400 khi thiếu trường bắt buộc")
    void createInventory_ValidationError() throws Exception {
        String invalidJson = """
                {
                    "productId": null,
                    "warehouseId": null
                }
                """;

        mockMvc.perform(post("/api/inventories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("PUT /api/inventories/{id} - Cập nhật vị trí lưu kho")
    void updateInventory_Success() throws Exception {
        InventoryUpdateRequest request = new InventoryUpdateRequest("Kệ B1-01", null);
        when(inventoryService.updateInventory(eq(1L), any(InventoryUpdateRequest.class))).thenReturn(sampleResponse);

        mockMvc.perform(put("/api/inventories/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("POST /api/inventories/{id}/adjust - Điều chỉnh kho thành công")
    void adjustStock_Success() throws Exception {
        InventoryAdjustRequest request = new InventoryAdjustRequest("IN", 10, "Nhập thêm", "PNK-001");
        when(inventoryService.adjustStock(eq(1L), any(InventoryAdjustRequest.class))).thenReturn(sampleResponse);

        mockMvc.perform(post("/api/inventories/1/adjust")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("POST /api/inventories/{id}/adjust - Báo lỗi 400 khi không đủ tồn kho")
    void adjustStock_InsufficientStock_Returns400() throws Exception {
        InventoryAdjustRequest request = new InventoryAdjustRequest("OUT", 100, "Xuất quá nhiều", "PXK-001");
        when(inventoryService.adjustStock(eq(1L), any(InventoryAdjustRequest.class)))
                .thenThrow(new BadRequestException("INSUFFICIENT_STOCK", "Không đủ tồn kho khả dụng"));

        mockMvc.perform(post("/api/inventories/1/adjust")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("INSUFFICIENT_STOCK"));
    }
}
