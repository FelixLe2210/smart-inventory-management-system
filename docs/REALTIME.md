# Cập nhật thời gian thực

## Kiến trúc

```
Thao tác tồn kho (adjust / transfer / nhận hàng PO)
        │  trong transaction
        ▼
InventoryService ── phát InventoryChangedEvent
        │  chỉ SAU KHI commit thành công (TransactionalEventListener AFTER_COMMIT)
        ▼
InventoryEventBroadcaster ── INVENTORY_UPDATED (mọi thay đổi)
        │                  └─ STOCK_ALERT (khi vừa rơi vào LOW_STOCK / OUT_OF_STOCK)
        ▼
InventoryWebSocketHandler ── gửi tới mọi client của  ws://<host>/ws/inventory?token=<JWT>
        ▼
Frontend RealtimeProvider ── chuông thông báo + cập nhật bảng Tồn kho không cần tải lại
```

- **Xác thực:** trình duyệt không gửi được header khi mở WebSocket, nên JWT đi qua `?token=`; sai hoặc thiếu token thì handshake bị từ chối (401).
- **Không báo lặp:** `STOCK_ALERT` chỉ gửi khi trạng thái chuyển vào mức cảnh báo hoặc nặng hơn (LOW → OUT); xuất thêm khi đã LOW không báo lại.
- **Nhất quán:** sự kiện chỉ phát khi transaction commit, nên client không bao giờ thấy số liệu của một giao dịch bị hoàn tác.
- **Chịu lỗi:** một client chậm hoặc đứt không làm các client khác mất tin; client tự kết nối lại sau 1s, 2s, 4s ... tối đa 30s (kèm nhiễu), gửi `ping` mỗi 25s, và nạp lại bảng tồn kho sau khi nối lại để bù sự kiện đã lỡ.

## Định dạng tin

```json
{ "type": "INVENTORY_UPDATED",
  "data": { "inventoryId": 12, "productId": 3, "productSku": "SI-MOUSE", "productName": "...",
            "warehouseId": 1, "warehouseName": "...", "currentStock": 25, "reservedStock": 0,
            "availableStock": 25, "previousStatus": "IN_STOCK", "stockStatus": "LOW_STOCK",
            "changeType": "ADJUST_OUT", "occurredAt": "2026-11-06T10:00:00Z" } }
```
`type` còn có `STOCK_ALERT` (cùng `data`), `CONNECTED`, `PONG`. `changeType`: `CREATED`, `ADJUST_<IN|OUT|SET|RESERVE|RELEASE>`, `TRANSFER_OUT`, `TRANSFER_IN`, `RECEIVING`.

## Cách kiểm tra

1. **Thủ công (2 trình duyệt):** đăng nhập `admin` ở hai cửa sổ, mở trang Tồn kho ở cả hai. Điều chỉnh xuất kho một dòng ở cửa sổ A:
   cửa sổ B tự đổi số lượng và trạng thái; nếu xuống mức tối thiểu thì chuông ở cả hai hiện thông báo.
2. **Mất kết nối:** tắt backend, chấm trạng thái cạnh chuông chuyển vàng "Mất kết nối, đang thử lại"; bật lại thì xanh và bảng tự nạp lại.
3. **Tự động, nhiều client** (cần Node 22+, backend đang chạy với dữ liệu mẫu):
   `node docs/api/realtime-e2e.mjs`
4. **Đồng thời / nhất quán** (SQL Server thật):
   `node docs/api/concurrency-check.mjs`, sau đó chạy `deploy/sample-data/check_data_readiness.sql` và xác nhận 8/8 kiểm tra nhất quán.
5. **Test đơn vị:** `cd backend && .\mvnw.cmd test` và `cd frontend && npm test`.

## Giới hạn hiện tại

- Chỉ phát sự kiện tồn kho; thay đổi đơn đặt hàng chưa phát tin (trang đơn hàng vẫn cần tải lại).
- Một máy chủ backend duy nhất: danh sách client nằm trong bộ nhớ. Chạy nhiều bản backend cần thêm bộ phát tin trung gian (Redis, message broker).
- Sau khi token hết hạn (1 giờ), kết nối đang mở vẫn sống nhưng lần kết nối lại sẽ bị từ chối cho đến khi đăng nhập lại.
