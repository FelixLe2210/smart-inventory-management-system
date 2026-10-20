package com.smartinventory.controller;

import com.smartinventory.dto.InventoryTransactionResponse;
import com.smartinventory.dto.TransactionHistoryPageResponse;
import com.smartinventory.service.InventoryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TransactionController.class)
@AutoConfigureMockMvc(addFilters = false)
class TransactionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private InventoryService inventoryService;

    @Test
    void getTransactionsReturnsFilteredPageAndTransactionLineIdentity() throws Exception {
        InventoryTransactionResponse transaction = new InventoryTransactionResponse(
                8L, "TXN-123-IN", "TXN-123", 2, "TRANSFER_IN",
                12L, 1L, 2L, 5, 0, 5, "MOVE-1", "Transfer", 3L, LocalDateTime.now());
        when(inventoryService.getTransactionHistory(12L, 2L, "TRANSFER_IN", "MOVE", 0, 10))
                .thenReturn(new TransactionHistoryPageResponse(List.of(transaction), 0, 10, 1, 1, true, true));

        mockMvc.perform(get("/api/transactions")
                        .param("productId", "12")
                        .param("warehouseId", "2")
                        .param("type", "TRANSFER_IN")
                        .param("search", "MOVE")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].transactionNo").value("TXN-123"))
                .andExpect(jsonPath("$.data.content[0].lineNo").value(2))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.last").value(true));
    }
}
