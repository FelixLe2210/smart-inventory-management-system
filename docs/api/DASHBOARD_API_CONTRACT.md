# Dashboard / Alert / Report – Contract API (Sprint 6)

Tài liệu này là **hợp đồng giữa Frontend (M4) và Backend (M1/M2)**. Frontend đã được viết sẵn theo contract này
(`frontend/src/api/dashboardApi.js`) và có **cơ chế fallback**: nếu một endpoint chưa tồn tại, UI tự tính số liệu từ
`/api/products`, `/api/inventories`, `/api/warehouses`, `/api/categories`, `/api/inventories/{id}/transactions`.
Khi backend triển khai đúng contract bên dưới, UI tự chuyển sang dùng số liệu backend (badge **"Nguồn số liệu: Backend API"**) mà không cần sửa code.

## Quy tắc fallback (quan trọng)

| Phản hồi của backend | Hành vi của UI |
|---|---|
| `404`, `405`, `501` (endpoint chưa có) | Fallback tính tại client, badge "Tính tại client" |
| `200` nhưng **sai shape** (thiếu trường bắt buộc) | Coi như chưa có → fallback tính tại client |
| `401`, `403`, `5xx`, mất mạng | **Không fallback** — hiện thông báo lỗi, giữ nguyên số liệu đang có |

Mọi response bọc trong `ApiResponse` như các API khác: `{ success, data, error, timestamp }`. Cần JWT hợp lệ.

## 1. Alert API — Sprint6-01/02/03

`GET /api/alerts/stock?type=LOW_STOCK|OUT_OF_STOCK` (không truyền `type` = cả hai)

`data` là **mảng**, sắp xếp: `OUT_OF_STOCK` trước, thiếu hụt nhiều trước. Mỗi phần tử (dạng phẳng, UI cũng chấp nhận `product: {id, sku, name}` lồng):

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `productId`, `productSku`, `productName` | number/string | ✔ | |
| `type` (hoặc `alertType`) | `LOW_STOCK` \| `OUT_OF_STOCK` | ✔ | Giá trị khác bị bỏ qua |
| `availableStock` | number | ✔ | **Tổng khả dụng của sản phẩm qua các kho** |
| `minStockLevel` | number | ✔ | |
| `shortage` | number | | Mặc định `max(0, min - available)` |
| `warehouses` | `[{warehouseId, code, name, available}]` | | Phân bổ theo kho |

### Định nghĩa mức cảnh báo (BE và FE phải thống nhất)

Tính **theo sản phẩm, cộng dồn các kho**, trên **tồn khả dụng** (`currentStock − reservedStock`, không âm):

| Mức | Điều kiện |
|---|---|
| `OUT_OF_STOCK` | khả dụng ≤ 0 (kể cả sản phẩm chưa có dòng tồn nào) |
| `LOW_STOCK` | `minStockLevel > 0` và 0 < khả dụng ≤ `minStockLevel` |
| *(không cảnh báo)* | còn lại; sản phẩm không `ACTIVE` bị bỏ qua |

> ⚠ Khác với cột trạng thái của **từng dòng tồn kho** (`Inventory.getStockStatus()`), vốn tính **theo từng kho** trên `currentStock` (không trừ giữ chỗ).
> Ví dụ Min = 10, kho A còn 6, kho B còn 5 → trang **Tồn kho** hiện cả hai dòng "Sắp hết", nhưng **Cảnh báo/Dashboard không cảnh báo** vì tổng 11 > 10.
> Nếu nhóm muốn cảnh báo theo từng kho, cần đổi đồng thời cả backend và `utils/stockAlerts.js`.

## 2. Dashboard KPI API — Sprint6-05

`GET /api/dashboard/kpis` → `data` là **object**. Bắt buộc có 4 trường số: `totalProducts`, `totalStockQuantity`, `lowStockCount`, `outOfStockCount`. Các trường còn lại tùy chọn (thiếu thì UI tự tính):

```json
{
  "totalProducts": 120,
  "totalStockQuantity": 8450,
  "totalReservedQuantity": 310,
  "totalAvailableQuantity": 8140,
  "totalInventoryValue": 1250000000,
  "lowStockCount": 7,
  "outOfStockCount": 3,
  "totalWarehouses": 4,
  "activeWarehouses": 3
}
```

`lowStockCount` / `outOfStockCount` **phải bằng** số phần tử cùng loại của Alert API (cùng định nghĩa ở mục 1). `totalInventoryValue = Σ currentStock × purchasePrice`.

## 3. Transaction Report API — Sprint6-06

`GET /api/reports/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD&type=&warehouseId=&productId=`

`from`/`to` gồm cả hai đầu mút (hết ngày `to`). `warehouseId` lọc theo **kho sở hữu giao dịch**: `RECEIVING`/`TRANSFER_IN` → kho đích; `ISSUING`/`TRANSFER_OUT`/`ADJUSTMENT` → kho nguồn (để một lần chuyển kho không bị đếm đôi).

```json
{
  "summary": {
    "totalCount": 5,
    "receivedQuantity": 100,
    "issuedQuantity": 30,
    "transferredQuantity": 20,
    "adjustmentCount": 1,
    "netChange": 66
  },
  "byType": [{ "type": "RECEIVING", "label": "Nhập kho", "count": 1, "quantity": 100 }],
  "rows": [ { /* cùng shape InventoryTransactionResponse + productSku, productName */ } ]
}
```

- `transferredQuantity`: chỉ cộng phía `TRANSFER_OUT` (một lần chuyển sinh 2 dòng cùng số lượng).
- `netChange`: Σ biến động có dấu (`RECEIVING` +, `ISSUING` −, `ADJUSTMENT` = `balanceAfter − balanceBefore`). **Chuyển kho không tính** khi xem toàn hệ thống; khi lọc theo một kho thì tính.
- Bắt buộc có `summary` (object) và `rows` (mảng).

## 4. Inventory Report API — Sprint6-07

`GET /api/reports/inventory?warehouseId=&categoryId=&status=IN_STOCK|LOW_STOCK|OUT_OF_STOCK|OVER_STOCK`

```json
{
  "summary": {
    "rowCount": 4, "totalQuantity": 315, "totalReserved": 10, "totalAvailable": 305,
    "totalValue": 307500, "lowStockCount": 1, "outOfStockCount": 1, "overStockCount": 1
  },
  "rows": [{
    "inventoryId": 1, "productId": 1, "sku": "A", "productName": "Alpha", "categoryName": "Điện tử",
    "warehouseId": 10, "warehouseCode": "HN", "warehouseName": "Kho Hà Nội",
    "currentStock": 50, "reservedStock": 10, "availableStock": 40,
    "minStockLevel": 10, "maxStockLevel": 200, "unitCost": 1000, "stockValue": 50000,
    "status": "IN_STOCK"
  }]
}
```

Mỗi dòng = một cặp (sản phẩm, kho). `status` dùng đúng quy tắc `Inventory.getStockStatus()`. Các số trong `summary` là tổng của đúng các `rows` đã lọc, và `totalQuantity`/`totalValue` khi **không lọc** phải bằng `totalStockQuantity`/`totalInventoryValue` của KPI API.

## Test đối chiếu

`frontend/src/utils/stockAlerts.test.mjs` và `reports.test.mjs` chứa các ca số liệu mẫu (biên Min, nhiều kho, giữ chỗ, chuyển kho không đếm đôi…) — backend nên dùng cùng bộ ca khi viết **Sprint6-04 Alert Logic Testing** và **Sprint6-08 Report Testing**.
