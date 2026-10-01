# Tài liệu Kiểm thử Master Data (Sprint3-16)

Tài liệu này hướng dẫn chi tiết quy trình kiểm thử và kết quả thực hiện cho toàn bộ Master Data Flow: **Warehouse**, **Category**, **Supplier**, và **Product**.

---

## 1. Kết quả kiểm thử tự động (Unit & Integration Tests)

Hệ thống đã thiết lập 28 kịch bản kiểm thử MockMvc tự động kiểm tra toàn bộ Controller, Service, Validation DTO, và Exception Handler:

| Test Suite | Số Test | Failures | Kết quả | Mô tả kiểm thử |
|------------|:-------:|:--------:|:-------:|----------------|
| [`WarehouseControllerTest`](file:///d:/smart-inventory-management-system/backend/src/test/java/com/smartinventory/controller/WarehouseControllerTest.java) | 9 | 0 | ✅ PASS | GET all, GET by ID, 404 Not Found, POST tạo mới, POST validation lỗi (400), POST trùng mã (409 Conflict), PUT cập nhật, PATCH đổi trạng thái, DELETE |
| [`ProductControllerTest`](file:///d:/smart-inventory-management-system/backend/src/test/java/com/smartinventory/controller/ProductControllerTest.java) | 5 | 0 | ✅ PASS | GET all, POST tạo mới thành công, POST thiếu categoryId (400), POST trùng SKU (409), DELETE |
| [`SupplierControllerTest`](file:///d:/smart-inventory-management-system/backend/src/test/java/com/smartinventory/controller/SupplierControllerTest.java) | 5 | 0 | ✅ PASS | GET all, POST tạo mới, POST sai định dạng email (400), POST trùng mã NCC (409), DELETE |
| [`CategoryControllerTest`](file:///d:/smart-inventory-management-system/backend/src/test/java/com/smartinventory/controller/CategoryControllerTest.java) | 5 | 0 | ✅ PASS | GET all, POST tạo mới, POST để trống mã (400), POST trùng mã danh mục (409), DELETE |
| [`GlobalExceptionHandlerTest`](file:///d:/smart-inventory-management-system/backend/src/test/java/com/smartinventory/controller/GlobalExceptionHandlerTest.java) | 4 | 0 | ✅ PASS | JSON sai cú pháp (400 MALFORMED_REQUEST), sai kiểu tham số URL (400 BAD_REQUEST), 404 Resource Not Found, 409 Conflict |
| **Tổng cộng** | **28** | **0** | **100% PASS** | Chạy bằng `./mvnw test` |

### Lệnh chạy kiểm thử:
```powershell
cd d:\smart-inventory-management-system\backend
./mvnw test
```

---

## 2. Luồng nghiệp vụ Master Data (End-to-End Flow)

1. **Bước 1: Khởi tạo Danh mục (Category)**
   - `POST /api/categories`
   - Payload:
     ```json
     {
       "code": "CAT-COMP",
       "name": "Máy tính & Thiết bị văn phòng",
       "description": "Linh kiện, thiết bị CNTT"
     }
     ```
   - Nhận về `id` (ví dụ `1`).

2. **Bước 2: Khởi tạo Nhà cung cấp (Supplier)**
   - `POST /api/suppliers`
   - Payload:
     ```json
     {
       "code": "SUP-DELL01",
       "name": "Dell Technologies Vietnam",
       "email": "contact@dell.com.vn",
       "phone": "02838221133",
       "leadTimeDays": 5,
       "reliabilityScore": 0.98,
       "status": "ACTIVE"
     }
     ```
   - Nhận về `id` (ví dụ `1`).

3. **Bước 3: Khởi tạo Sản phẩm (Product) liên kết Category & Supplier**
   - `POST /api/products`
   - Payload:
     ```json
     {
       "sku": "PRD-DELL-XPS15",
       "barcode": "8939001122334",
       "name": "Dell XPS 15 9530 i7 32GB 1TB",
       "categoryId": 1,
       "supplierId": 1,
       "unit": "Chiếc",
       "purchasePrice": 42000000,
       "sellingPrice": 48990000,
       "minStockLevel": 5,
       "maxStockLevel": 50,
       "status": "ACTIVE"
     }
     ```

4. **Bước 4: Khởi tạo Chi nhánh kho (Warehouse)**
   - `POST /api/warehouses`
   - Payload:
     ```json
     {
       "code": "KHO-HN01",
       "name": "Kho Quang Minh - Hà Nội",
       "address": "KCN Quang Minh, H. Mê Linh, Hà Nội",
       "phone": "0912889922",
       "status": "ACTIVE"
     }
     ```

5. **Bước 5: Thao tác giao diện UI & API Frontend**
   - Mở giao diện `http://localhost:5173/warehouses`.
   - Bấm **Thêm mới chi nhánh kho** → Nhập mã, tên, địa chỉ, chọn loại kho và khu vực.
   - Thử nhập thiếu trường hoặc trùng mã: Hệ thống hiển thị cảnh báo viền đỏ và text lỗi inline ngay dưới trường đó mà không bị crash.
   - Bấm **Lưu & Tạo chi nhánh**: Gọi `warehouseApi.create()`, cập nhật bảng và hiển thị toast thông báo thành công.
   - Bấm switch toggle trạng thái: Gọi `warehouseApi.updateStatus()`, cập nhật badge và trạng thái kho.

---

## 3. Postman Collection

File import Postman đã được chuẩn bị đầy đủ tại:
[Smart_Inventory_Master_Data.postman_collection.json](file:///d:/smart-inventory-management-system/docs/api/Smart_Inventory_Master_Data.postman_collection.json)
