package com.smartinventory.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartinventory.dto.PurchaseOrderRequest;
import com.smartinventory.dto.PurchaseOrderResponse;
import com.smartinventory.exception.ConflictException;
import com.smartinventory.service.PurchaseOrderService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
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

@WebMvcTest(PurchaseOrderController.class)
@AutoConfigureMockMvc(addFilters = false)
class PurchaseOrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PurchaseOrderService purchaseOrderService;

    @Test
    @DisplayName("POST /api/purchase-orders - thiếu sản phẩm trả 400 VALIDATION_ERROR")
    void createWithoutItemsIsRejected() throws Exception {
        String body = """
                {"supplierId":1,"destinationWarehouseId":2,"items":[]}
                """;
        mockMvc.perform(post("/api/purchase-orders").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
        verifyNoInteractions(purchaseOrderService);
    }

    @Test
    @DisplayName("POST /api/purchase-orders - số lượng 0 bị từ chối")
    void createWithZeroQuantityIsRejected() throws Exception {
        String body = """
                {"supplierId":1,"destinationWarehouseId":2,"items":[{"productId":10,"orderedQty":0}]}
                """;
        mockMvc.perform(post("/api/purchase-orders").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/purchase-orders - hợp lệ trả 201")
    void createSucceeds() throws Exception {
        when(purchaseOrderService.create(any(PurchaseOrderRequest.class))).thenReturn(samplePo(5L));
        String body = """
                {"supplierId":1,"destinationWarehouseId":2,"items":[{"productId":10,"orderedQty":5}]}
                """;

        mockMvc.perform(post("/api/purchase-orders").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("DRAFT"));
    }

    @Test
    @DisplayName("POST /{id}/receive - body thiếu dòng trả 400; chuyển trạng thái sai trả 409")
    void receiveValidationAndConflict() throws Exception {
        mockMvc.perform(post("/api/purchase-orders/5/receive").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"lines\":[]}"))
                .andExpect(status().isBadRequest());

        when(purchaseOrderService.receive(eq(5L), any()))
                .thenThrow(new ConflictException("INVALID_PO_STATUS", "Chỉ nhận hàng được với đơn SENT"));
        mockMvc.perform(post("/api/purchase-orders/5/receive").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"lines\":[{\"itemId\":1,\"quantity\":3}]}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("INVALID_PO_STATUS"));
    }

    @Test
    @DisplayName("GET /api/purchase-orders - lọc theo trạng thái")
    void searchPassesFilters() throws Exception {
        when(purchaseOrderService.search("SENT", 1L, null)).thenReturn(List.of());

        mockMvc.perform(get("/api/purchase-orders").param("status", "SENT").param("supplierId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
        verify(purchaseOrderService).search("SENT", 1L, null);
    }

    private static PurchaseOrderResponse samplePo(Long id) {
        return new PurchaseOrderResponse(id, "PO-20261104-ABCDEF12", 1L, "SUP-01", "NCC A", 2L, "WH-01", "Kho 1",
                "DRAFT", null, null, null, java.math.BigDecimal.TEN, null, null, "buyer", null, null, List.of());
    }
}
