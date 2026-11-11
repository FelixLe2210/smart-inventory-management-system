package com.smartinventory.realtime;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class InventoryEventBroadcasterTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final InventoryWebSocketHandler handler = mock(InventoryWebSocketHandler.class);
    private final InventoryEventBroadcaster broadcaster = new InventoryEventBroadcaster(handler, mapper);

    private InventoryChangedEvent event(String previous, String current, int stock) {
        return new InventoryChangedEvent(1L, 2L, "SKU", "Chuột", 3L, "Kho A", stock, 0, stock,
                previous, current, "ADJUST_OUT", Instant.parse("2026-11-06T10:00:00Z"));
    }

    private List<JsonNode> sent(int times) throws Exception {
        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(handler, times(times)).broadcast(captor.capture());
        return captor.getAllValues().stream().map(json -> {
            try {
                return mapper.readTree(json);
            } catch (Exception exception) {
                throw new IllegalStateException(exception);
            }
        }).toList();
    }

    @Test
    @DisplayName("Đổi tồn bình thường chỉ gửi INVENTORY_UPDATED")
    void normalChangeSendsOnlyUpdate() throws Exception {
        broadcaster.onInventoryChanged(event("IN_STOCK", "IN_STOCK", 40));
        List<JsonNode> messages = sent(1);
        assertEquals("INVENTORY_UPDATED", messages.get(0).get("type").asText());
        assertEquals(40, messages.get(0).get("data").get("currentStock").asInt());
        assertEquals("Kho A", messages.get(0).get("data").get("warehouseName").asText());
    }

    @Test
    @DisplayName("Rơi vào LOW_STOCK gửi thêm STOCK_ALERT")
    void newLowStockAlsoSendsAlert() throws Exception {
        broadcaster.onInventoryChanged(event("IN_STOCK", "LOW_STOCK", 8));
        List<JsonNode> messages = sent(2);
        assertEquals("INVENTORY_UPDATED", messages.get(0).get("type").asText());
        assertEquals("STOCK_ALERT", messages.get(1).get("type").asText());
        assertEquals("LOW_STOCK", messages.get(1).get("data").get("stockStatus").asText());
    }

    @Test
    @DisplayName("Đổi trạng thái đơn đặt hàng gửi PO_UPDATED")
    void purchaseOrderChangeSendsPoUpdated() throws Exception {
        broadcaster.onPurchaseOrderChanged(new PurchaseOrderChangedEvent(
                9L, "PO-20261106-001", "SENT", "PARTIALLY_RECEIVED", "RECEIVED",
                Instant.parse("2026-11-06T10:00:00Z")));
        List<JsonNode> messages = sent(1);
        assertEquals("PO_UPDATED", messages.get(0).get("type").asText());
        assertEquals("PO-20261106-001", messages.get(0).get("data").get("poNumber").asText());
        assertEquals("PARTIALLY_RECEIVED", messages.get(0).get("data").get("status").asText());
    }
}
