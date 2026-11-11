package com.smartinventory.realtime;

import com.smartinventory.model.Inventory;

import java.time.Instant;

/**
 * Sự kiện nội bộ: một bản ghi tồn kho vừa đổi.
 *
 * @param previousStatus trạng thái trước thay đổi (IN_STOCK, LOW_STOCK, OUT_OF_STOCK, OVER_STOCK)
 * @param stockStatus    trạng thái sau thay đổi
 */
public record InventoryChangedEvent(
        Long inventoryId,
        Long productId,
        String productSku,
        String productName,
        Long warehouseId,
        String warehouseName,
        int currentStock,
        int reservedStock,
        int availableStock,
        String previousStatus,
        String stockStatus,
        String changeType,
        Instant occurredAt
) {

    public static InventoryChangedEvent of(Inventory inventory, int previousStock, String changeType) {
        int current = inventory.getCurrentStock() != null ? inventory.getCurrentStock() : 0;
        int reserved = inventory.getReservedStock() != null ? inventory.getReservedStock() : 0;
        return new InventoryChangedEvent(
                inventory.getId(),
                inventory.getProduct().getId(),
                inventory.getProduct().getSku(),
                inventory.getProduct().getName(),
                inventory.getWarehouse().getId(),
                inventory.getWarehouse().getName(),
                current,
                reserved,
                Math.max(0, current - reserved),
                Inventory.statusFor(inventory.getProduct(), previousStock),
                Inventory.statusFor(inventory.getProduct(), current),
                changeType,
                Instant.now());
    }

    /** True khi tồn kho vừa rơi vào mức cần cảnh báo (trước đó chưa cảnh báo): tránh báo lặp mỗi lần xuất kho. */
    public boolean isNewAlert() {
        boolean alertNow = "LOW_STOCK".equals(stockStatus) || "OUT_OF_STOCK".equals(stockStatus);
        boolean alertBefore = "LOW_STOCK".equals(previousStatus) || "OUT_OF_STOCK".equals(previousStatus);
        return alertNow && (!alertBefore || !stockStatus.equals(previousStatus));
    }
}
