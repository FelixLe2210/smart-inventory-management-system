# Nhập kho / Xuất kho / Chuyển kho: API, xử lý lỗi và kiểm thử

Sprint 5, phần M4 (Sprint5-13 đến Sprint5-16). Tài liệu này mô tả luồng chuyển kho trên giao diện,
cách giao diện xử lý lỗi giao dịch, và cách chạy các bộ kiểm thử.

## 1. API sử dụng

| Việc | Endpoint | Ghi nhận giao dịch |
|---|---|---|
| Nhập kho | `POST /api/inventories/{id}/adjust` với `adjustmentType: IN` | `RECEIVING` |
| Xuất kho | `POST /api/inventories/{id}/adjust` với `adjustmentType: OUT` | `ISSUING` |
| Chuyển kho | `POST /api/inventories/{sourceId}/transfer` | `TRANSFER_OUT` (kho nguồn) + `TRANSFER_IN` (kho đích) |
| Nhật ký của một dòng tồn | `GET /api/inventories/{id}/transactions` | |

Giữ chỗ (`RESERVE`, `RELEASE`) không ghi giao dịch.

**Chuyển kho** nhận `{ destinationWarehouseId, quantity, reason?, referenceDoc? }`, trong đó `{sourceId}` là
ID của **dòng tồn** ở kho nguồn (không phải ID kho). Phản hồi là dòng tồn của **kho đích** sau khi chuyển.
Nếu kho đích chưa có dòng tồn cho sản phẩm, backend tự tạo. Hai giao dịch của một lần chuyển có mã
`TXN-<uuid>-OUT` và `TXN-<uuid>-IN` (cùng gốc). Mỗi dòng tồn chỉ thấy phía của mình trong nhật ký.

Quy tắc kiểm tra (backend là nơi quyết định cuối cùng, giao diện lặp lại để báo lỗi sớm):

- Số lượng là số nguyên > 0 và không vượt **tồn khả dụng** (tồn hiện tại trừ phần đang giữ chỗ).
- Kho nguồn khác kho đích. Cả hai kho phải `ACTIVE`. Sản phẩm phải `ACTIVE`.

## 2. Trang Chuyển kho (`/transfer`)

- Vào từ menu **Chuyển kho (Transfer)** hoặc từ nút ⇄ ở từng dòng trang **Tồn kho** (mở sẵn sản phẩm và kho nguồn).
- Chọn sản phẩm (chỉ liệt kê sản phẩm còn tồn khả dụng) → kho nguồn (tự chọn nếu chỉ có một kho có hàng)
  → kho đích (chỉ kho `ACTIVE`, khác kho nguồn) → số lượng.
- Có bản xem trước tồn hai kho, cảnh báo nếu kho nguồn xuống dưới mức tồn tối thiểu.
- Sau khi chuyển, trang **đọc lại tồn thật từ server** và đối chiếu: kho nguồn giảm đúng số lượng, kho đích tăng
  đúng số lượng, tổng hai kho không đổi. Lệch thì hiện cảnh báo thay vì báo thành công.
- Danh sách "vừa thực hiện trong phiên" chỉ lưu trên trình duyệt; lịch sử đầy đủ nằm ở **Nhật ký giao dịch**.

## 3. Xử lý lỗi giao dịch

Giao diện dùng `utils/transactionErrors.js` để biến lỗi từ backend thành thông báo và hành động tiếp theo.

| Mã lỗi | HTTP | Khi nào | Giao diện làm gì |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | Thiếu hoặc sai ô (từ `@Valid`) | Gắn lỗi vào từng ô theo `details` |
| `INSUFFICIENT_STOCK` | 400 | Xuất hoặc chuyển vượt tồn khả dụng | Lỗi ở ô số lượng, tải lại ngầm |
| `INSUFFICIENT_AVAILABLE_STOCK` | 400 | Giữ chỗ vượt tồn khả dụng | Lỗi ở ô số lượng |
| `INVALID_QUANTITY` | 400 | Số lượng ≤ 0 | Lỗi ở ô số lượng |
| `SAME_WAREHOUSE_TRANSFER` | 400 | Kho nguồn trùng kho đích | Lỗi ở ô kho đích |
| `WAREHOUSE_NOT_ACTIVE` | 400 | Kho không `ACTIVE` | Khung lỗi chung, tải lại ngầm |
| `PRODUCT_NOT_ACTIVE` | 400 | Sản phẩm không `ACTIVE` | Lỗi ở ô sản phẩm, tải lại ngầm |
| `WAREHOUSE_NOT_FOUND` / `PRODUCT_NOT_FOUND` | 404 | Đã bị xóa | Lỗi ở ô tương ứng, tải lại ngầm |
| `INVENTORY_NOT_FOUND` | 404 | Dòng tồn nguồn đã bị xóa | Báo chọn lại, tải lại ngầm |
| `STOCK_INCONSISTENT` | 409 | Giữ chỗ lớn hơn tồn hiện tại | Báo quản trị viên kiểm kê lại |
| `TRANSACTION_CONFLICT` | 409 | Hai giao dịch tranh khóa cùng dòng tồn (lock timeout, deadlock) | Nút **Thử lại**, tải lại ngầm |
| `DATA_INTEGRITY_VIOLATION` | 409 | Vi phạm ràng buộc CSDL (ví dụ xóa sản phẩm hoặc kho đã có giao dịch) | Báo vi phạm ràng buộc, tải lại ngầm |
| `UNAUTHORIZED` | 401 | Thiếu hoặc hết hạn đăng nhập | Báo hết phiên, liên kết **Đăng nhập lại** |
| `INTERNAL_ERROR` | 500 | Lỗi không lường trước | Báo lỗi hệ thống, nút **Thử lại** |
| `NETWORK_ERROR` | (không có) | Không tới được backend | Báo mất kết nối, nút **Thử lại** |

`TRANSACTION_CONFLICT` và `DATA_INTEGRITY_VIOLATION` là hai mã **mới**, thêm vào `GlobalExceptionHandler`.
Trước đây hai tình huống này đều rơi vào `INTERNAL_ERROR` (500) và lộ thông điệp SQL thô cho người xem log.
Backend chỉ trả thông điệp chung, không trả chi tiết SQL.

## 4. Chạy kiểm thử

```bash
# Logic giao diện (kiểm tra dữ liệu, xem trước, đối chiếu, ánh xạ lỗi)
cd frontend && npm test

# Backend (có test cho hai mã lỗi mới)
cd backend && ./mvnw test        # Windows cmd: mvnw.cmd test

# Toàn luồng nhập, xuất, chuyển kho với backend THẬT đang chạy
node docs/api/stock-movement-e2e.mjs
```

Kịch bản E2E (`stock-movement-e2e.mjs`) dựng 1 sản phẩm và 3 kho (A, B hoạt động; C bảo trì), rồi:
nhập 100 vào A → xuất 30 → giữ chỗ 10 → chuyển 20 từ A sang B (B chưa có dòng tồn) → chuyển ngược 5 từ B về A →
xuất hết B. Kiểm tra số dư hai kho, tổng tồn, chuỗi `balanceBefore`/`balanceAfter` liền mạch trong nhật ký,
cặp mã `-OUT`/`-IN`, và 10 tình huống lỗi (cùng kho, số lượng 0 hoặc âm, thiếu kho đích, vượt khả dụng,
kho đích không tồn tại, dòng tồn nguồn không tồn tại, kho đích bảo trì, không có token), với điều kiện
**tồn không đổi sau mỗi lỗi**. Script thoát mã 1 nếu có kiểm tra thất bại.

Script không dọn dữ liệu: sản phẩm và kho đã có giao dịch không xóa được (khóa ngoại). Dữ liệu test có tiền tố
`E2E-` kèm hậu tố ngẫu nhiên cho mỗi lần chạy.

## 5. Điểm tích hợp cần nhóm xem lại

Ghi nhận khi nối giao diện với backend giao dịch. Chưa sửa vì thuộc phần của người khác.

1. **Trang Nhật ký giao dịch chỉ đọc 15 dòng tồn đầu tiên** (`useTransactionHistory.js`, `invs.slice(0, 15)`).
   Giao dịch của các dòng tồn từ thứ 16 trở đi không hiện. Cần backend có endpoint liệt kê giao dịch toàn cục
   (có phân trang), hoặc bỏ giới hạn này.
2. **Nhập kho lần đầu cho sản phẩm chưa có dòng tồn** (`useStockMovement.js`) gọi `inventoryApi.create({ initialStock })`.
   Backend ghi giao dịch loại `ADJUSTMENT` với lý do "Initial stock" và **mất mã chứng từ, lý do** người dùng nhập.
   Cách khắc phục: tạo dòng tồn với `initialStock: 0` rồi gọi `receive`, để ghi đúng `RECEIVING` kèm chứng từ.
3. **Xóa sản phẩm hoặc kho đã có giao dịch** bị chặn bởi khóa ngoại. Nay trả `409 DATA_INTEGRITY_VIOLATION`
   thay vì 500, nhưng thông báo còn chung chung. Nếu cần thông báo cụ thể hơn, thêm kiểm tra ở
   `ProductService` và `WarehouseService` (tương tự `PRODUCT_HAS_STOCK`).
