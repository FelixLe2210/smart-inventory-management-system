# Inventory – Hướng dẫn kiểm thử (Sprint 4 · M4)

Phạm vi: **Sprint4-13** Stock Status UI · **Sprint4-14** Inventory Filtering · **Sprint4-15** Inventory Integration · **Sprint4-16** End-to-End Testing.

## 1. Quy tắc trạng thái tồn

Do backend (`Inventory.getStockStatus()`) tính từ `currentStock` và `minStockLevel` / `maxStockLevel` của Product, **không lưu vào DB**:

| Trạng thái | Điều kiện | Nhãn UI |
|---|---|---|
| `OUT_OF_STOCK` | tồn ≤ 0 | Hết hàng (Out of Stock) |
| `LOW_STOCK` | 0 < tồn ≤ Min | Sắp hết (Low Stock) |
| `IN_STOCK` | Min < tồn ≤ Max | Còn hàng (In Stock) |
| `OVER_STOCK` | tồn > Max | Vượt định mức (Over Stock) |

Đổi Min/Max ở trang Sản phẩm → trạng thái tồn kho tự đổi theo.

## 2. API sử dụng

| Method | Endpoint | Ghi chú |
|---|---|---|
| GET | `/api/inventories?warehouseId=&productId=` | Backend lọc theo kho / sản phẩm |
| GET | `/api/inventories/{id}` | |
| POST | `/api/inventories` | `{productId, warehouseId, initialStock?, reservedStock?, locationInWarehouse?}` |
| PUT | `/api/inventories/{id}` | Chỉ đổi `locationInWarehouse`, `lastStockCountAt` |
| POST | `/api/inventories/{id}/adjust` | `{adjustmentType: IN\|OUT\|SET\|RESERVE\|RELEASE, quantity, reason?, referenceDoc?}` |

Lọc theo **trạng thái** và **từ khóa**, cùng các thẻ KPI, được thực hiện ở frontend (`src/utils/inventoryFilters.js`) trên danh sách đã tải theo kho / sản phẩm.

## 3. Tích hợp Master Data ↔ Inventory (Sprint4-15)

- Form khai báo tồn chỉ cho chọn **sản phẩm ACTIVE** và **kho ACTIVE**; backend từ chối kho không hoạt động (`WAREHOUSE_NOT_ACTIVE`).
- Mỗi cặp Product–Warehouse chỉ có một dòng tồn (`INVENTORY_EXISTS`).
- **Xóa kho** đã có tồn kho → 409 `WAREHOUSE_HAS_INVENTORY` (nên chuyển kho sang INACTIVE).
- **Xóa sản phẩm** còn hàng ở bất kỳ kho nào → 409 `PRODUCT_HAS_STOCK`. Khi tồn = 0, bản ghi tồn bị xóa theo (FK `ON DELETE CASCADE`).
- Giao diện: trang **Sản phẩm** và **Kho** có nút biểu tượng kệ hàng mở `/inventory?productId=…` / `/inventory?warehouseId=…`. Bộ lọc đồng bộ lên URL.

## 4. Test tự động

```bash
# Backend
cd backend && ./mvnw test

# Frontend (logic lọc / KPI / kiểm tra điều chỉnh tồn) – không cần cài thêm gì, cần Node >= 18
cd frontend && npm test
```

| File | Nội dung |
|---|---|
| `InventoryStockStatusTest` | Quy tắc In / Low / Out / Over, biên Min và Max, tồn khả dụng |
| `InventoryEndToEndFlowTest` | Luồng Product → Warehouse → Inventory với 3 service thật + repository giả lập trong bộ nhớ |
| `ProductServiceDeleteTest` | Chặn xóa sản phẩm còn tồn |
| `WarehouseServiceTest` | Chặn xóa kho có tồn kho |
| `frontend/src/utils/inventoryFilters.test.mjs` | `summarize`, `filterInventory`, `validateAdjustment` |

## 5. E2E với backend + SQL Server thật

Bật backend (profile `dev`), rồi:

```bash
node docs/api/inventory-e2e.mjs
# hoặc: API_BASE=http://localhost:8080/api E2E_USER=admin E2E_PASS=Admin@123 node docs/api/inventory-e2e.mjs
```

Script tạo category/product/warehouse → khai báo tồn → đi qua 4 trạng thái → giữ chỗ/xuất kho → lọc → đổi Min ở Product → kiểm tra các ràng buộc → tự dọn dữ liệu. Thoát mã 0 nếu tất cả đạt.

## 6. Checklist kiểm thử giao diện (thủ công)

1. Đăng nhập `admin / Admin@123` → menu **Kiểm kê & Tồn kho** mở `/inventory`.
2. Tạo 1 sản phẩm (Min = 10, Max = 100) và 1 kho đang hoạt động ở các trang Master Data.
3. **Khai báo tồn kho**: chọn sản phẩm + kho, tồn ban đầu 50 → chip xanh **Còn hàng**.
4. **Điều chỉnh** (biểu tượng tune): SET 10 → vàng **Sắp hết**; SET 0 → đỏ **Hết hàng**; IN 150 → xanh dương **Vượt định mức**; KPI đổi theo.
5. Chọn OUT lớn hơn tồn khả dụng → form báo lỗi, phần "Sau điều chỉnh" hiển thị số dự kiến.
6. Bấm thẻ KPI "Sắp hết" → bộ lọc đổi và URL có `?status=LOW_STOCK`.
7. Lọc theo kho / sản phẩm / trạng thái, gõ tìm theo SKU; nút **Đặt lại** xóa bộ lọc.
8. Khai báo trùng cặp → báo lỗi; kho bảo trì không có trong danh sách chọn.
9. Ở trang Kho, xóa kho đã có tồn → báo lỗi 409; bấm biểu tượng kệ hàng → `/inventory?warehouseId=…`.
10. Tắt backend, bấm **Làm mới** → thông báo lỗi kết nối và nút **Thử lại**.
