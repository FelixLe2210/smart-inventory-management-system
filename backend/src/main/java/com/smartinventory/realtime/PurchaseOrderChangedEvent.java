package com.smartinventory.realtime;

import com.smartinventory.model.PurchaseOrder;

import java.time.Instant;

/**
 * Sự kiện nội bộ: một đơn đặt hàng vừa tạo hoặc đổi trạng thái.
 *
 * @param changeType CREATED, SENT, CANCELLED hoặc RECEIVED (nhận hàng, trạng thái mới nằm ở {@code status})
 */
public record PurchaseOrderChangedEvent(
        Long poId,
        String poNumber,
        String previousStatus,
        String status,
        String changeType,
        Instant occurredAt
) {

    public static PurchaseOrderChangedEvent of(PurchaseOrder po, String previousStatus, String changeType) {
        return new PurchaseOrderChangedEvent(po.getId(), po.getPoNumber(), previousStatus, po.getStatus(),
                changeType, Instant.now());
    }
}
