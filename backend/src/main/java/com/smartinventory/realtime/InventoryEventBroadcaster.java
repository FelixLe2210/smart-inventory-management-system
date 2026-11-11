package com.smartinventory.realtime;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Chuyển {@link InventoryChangedEvent} thành tin WebSocket sau khi transaction commit.
 * Mỗi thay đổi gửi {@code INVENTORY_UPDATED}; nếu tồn kho vừa rơi vào mức cảnh báo thì gửi thêm {@code STOCK_ALERT}.
 */
@Component
public class InventoryEventBroadcaster {

    private static final Logger log = LoggerFactory.getLogger(InventoryEventBroadcaster.class);

    private final InventoryWebSocketHandler handler;
    private final ObjectMapper objectMapper;

    public InventoryEventBroadcaster(InventoryWebSocketHandler handler, ObjectMapper objectMapper) {
        this.handler = handler;
        this.objectMapper = objectMapper;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onInventoryChanged(InventoryChangedEvent event) {
        send("INVENTORY_UPDATED", event);
        if (event.isNewAlert()) {
            send("STOCK_ALERT", event);
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onPurchaseOrderChanged(PurchaseOrderChangedEvent event) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("poId", event.poId());
        data.put("poNumber", event.poNumber());
        data.put("previousStatus", event.previousStatus());
        data.put("status", event.status());
        data.put("changeType", event.changeType());
        data.put("occurredAt", event.occurredAt().toString());
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("type", "PO_UPDATED");
        envelope.put("data", data);
        try {
            handler.broadcast(objectMapper.writeValueAsString(envelope));
        } catch (JsonProcessingException exception) {
            log.error("Cannot serialize PO_UPDATED event for PO {}", event.poId(), exception);
        }
    }

    private void send(String type, InventoryChangedEvent event) {
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("type", type);
        envelope.put("data", toPayload(event));
        try {
            handler.broadcast(objectMapper.writeValueAsString(envelope));
        } catch (JsonProcessingException exception) {
            log.error("Cannot serialize {} event for inventory {}", type, event.inventoryId(), exception);
        }
    }

    private static Map<String, Object> toPayload(InventoryChangedEvent e) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("inventoryId", e.inventoryId());
        data.put("productId", e.productId());
        data.put("productSku", e.productSku());
        data.put("productName", e.productName());
        data.put("warehouseId", e.warehouseId());
        data.put("warehouseName", e.warehouseName());
        data.put("currentStock", e.currentStock());
        data.put("reservedStock", e.reservedStock());
        data.put("availableStock", e.availableStock());
        data.put("previousStatus", e.previousStatus());
        data.put("stockStatus", e.stockStatus());
        data.put("changeType", e.changeType());
        data.put("occurredAt", e.occurredAt().toString());
        return data;
    }
}
