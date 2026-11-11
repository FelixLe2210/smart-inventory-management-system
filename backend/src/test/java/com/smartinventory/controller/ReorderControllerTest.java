package com.smartinventory.controller;

import com.smartinventory.dto.PurchaseOrderResponse;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.service.ReorderService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ReorderController.class)
@AutoConfigureMockMvc(addFilters = false)
class ReorderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ReorderService reorderService;

    @Test
    @DisplayName("POST /generate không có body = tính cho mọi tồn kho")
    void generateWithoutBody() throws Exception {
        when(reorderService.generate(null, null)).thenReturn(List.of());

        mockMvc.perform(post("/api/reorder/recommendations/generate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
        verify(reorderService).generate(null, null);
    }

    @Test
    @DisplayName("POST /generate với productId/warehouseId")
    void generateWithFilters() throws Exception {
        when(reorderService.generate(10L, 2L)).thenReturn(List.of());

        mockMvc.perform(post("/api/reorder/recommendations/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":10,\"warehouseId\":2}"))
                .andExpect(status().isOk());
        verify(reorderService).generate(10L, 2L);
    }

    @Test
    @DisplayName("POST /{id}/accept trả 201 và truyền số lượng chỉnh sửa")
    void acceptReturnsCreated() throws Exception {
        when(reorderService.accept(eq(7L), eq(150))).thenReturn(samplePo(9L));

        mockMvc.perform(post("/api/reorder/recommendations/7/accept")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"quantity\":150}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("DRAFT"));
    }

    @Test
    @DisplayName("POST /{id}/accept đề xuất đã xử lý trả 409")
    void acceptAlreadyProcessed() throws Exception {
        when(reorderService.accept(eq(7L), eq(null)))
                .thenThrow(new ConflictException("RECOMMENDATION_NOT_PENDING", "Đã xử lý"));

        mockMvc.perform(post("/api/reorder/recommendations/7/accept"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("RECOMMENDATION_NOT_PENDING"));
    }

    @Test
    @DisplayName("POST /{id}/accept với số lượng âm trả 400")
    void acceptNegativeQuantity() throws Exception {
        mockMvc.perform(post("/api/reorder/recommendations/7/accept")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"quantity\":-5}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(reorderService);
    }

    private static PurchaseOrderResponse samplePo(Long id) {
        return new PurchaseOrderResponse(id, "PO-20261104-ABCDEF12", 1L, "SUP-01", "NCC A", 2L, "WH-01", "Kho 1",
                "DRAFT", null, null, null, java.math.BigDecimal.TEN, null, null, "buyer", null, null, List.of());
    }
}
