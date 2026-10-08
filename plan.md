# 📋 KẾ HOẠCH & BÁO CÁO TOÀN DIỆN — SPRINT 3 (MILESTONE M1 – M4)

> **Tên dự án chính thức:** **Smart Inventory Management System for Demand Forecasting and Reorder Recommendation**  
> *(Hệ thống Quản lý Kho Thông minh Dự báo Nhu cầu & Đề xuất Đặt hàng Tự động)*  
> **Thời điểm cập nhật:** 2026-09-29  
> **Trạng thái:** ✅ **ĐỒNG BỘ 100% TÊN DỰ ÁN & GIAO DIỆN FE TOÀN BỘ CÁC THÀNH VIÊN + DỌN DẸP CODE THỪA + FIX TOÀN DIỆN UI/UX**

---

## 📌 1. Bảng Đối Chiếu Tiến Độ Theo Backlog Toàn Bộ Sprint 3

Dựa trên bảng kế hoạch tổng thể của dự án (M1, M2, M3, M4):

| STT | Mã Thẻ | Milestone | Tên Card / Hạng mục | Effort | Phân loại | Trạng thái | Chi tiết triển khai |
|:---:|:------:|:---------:|----------------------|:------:|:---------:|:----------:|:--------------------|
| 1 | **Sprint3-01** | M1 | Product Backend & API | 5h | BE | ✅ Hoàn thành | Entity, Repository, Service & Controller cho Product |
| 2 | **Sprint3-02** | M1 | Category Backend & API | 4h | BE / API | ✅ Hoàn thành | CRUD Category và validation cơ bản |
| 3 | **Sprint3-03** | M1 | Master Data Validation | 4h | BE | ✅ Hoàn thành | Validation SKU, Barcode, Category, Supplier và dữ liệu bắt buộc |
| 4 | **Sprint3-04** | M1 | Master Data Backend Review | 4h | BE / Test | ✅ Hoàn thành | Review API và business rules trước integration |
| 5 | **Sprint3-05** | M2 | Supplier Backend | 5h | BE | ✅ Hoàn thành | Entity, Repository, Service và CRUD API cho Supplier |
| 6 | **Sprint3-06** | M2 | Warehouse Backend | 5h | BE | ✅ Hoàn thành | Entity, Repository, Service và CRUD API cho Warehouse |
| 7 | **Sprint3-07** | M2 | Master Data Repository Setup | 4h | DB / BE | ✅ Hoàn thành | Hoàn thiện Repository & Database Mapping JPA |
| 8 | **Sprint3-08** | M2 | Master Data API Testing | 3h | Testing | ✅ Hoàn thành | Test CRUD, validation và foreign key constraints |
| 9 | **Sprint3-09** | M3 | Product List UI | 5h | FE | ✅ Hoàn thành | Giao diện hiển thị danh sách Product (`/products`) |
| 10 | **Sprint3-10** | M3 | Category UI | 4h | FE | ✅ Hoàn thành | Giao diện quản lý Category (`/categories`) |
| 11 | **Sprint3-11** | M3 | Supplier UI | 4h | FE | ✅ Hoàn thành | Danh sách và form thao tác Supplier (`/suppliers`) |
| 12 | **Sprint3-12** | M3 | Product Search & Filter UI | 4h | FE | ✅ Hoàn thành | Tìm kiếm & lọc đa tiêu chí cho Product |
| 13 | **Sprint3-13** | M4 | Warehouse UI | 4h | FE | ✅ Hoàn thành | Giao diện quản lý Warehouse (`/warehouses`) |
| 14 | **Sprint3-14** | M4 | Master Data API Integration | 4h | FE / Int | ✅ Hoàn thành | Kết nối Product / Category / Supplier / Warehouse với Backend |
| 15 | **Sprint3-15** | M4 | Master Data Error Handling | 5h | FE / BE | ✅ Hoàn thành | Xử lý validation inline, GlobalExceptionHandler, error banner |
| 16 | **Sprint3-16** | M4 | Master Data Integration Testing | 4h | Testing | ✅ Hoàn thành | Test toàn bộ flow Master Data (28/28 MockMvc tests 100% PASS) |

---

## 🧹 2. Dọn Dẹp Code Thừa, File Thừa (Dead Code Removal)

Đã rà soát kỹ lưỡng và loại bỏ toàn bộ các file rác / code thừa của giai đoạn cũ nhằm đảm bảo tính đồng bộ cấu trúc:
1. ❌ **Đã xóa:** `src/components/Layout.jsx` & `Layout.css` (layout cũ từ giai đoạn thử nghiệm).
2. ❌ **Đã xóa:** `src/components/Sidebar.jsx` & `Sidebar.css` (sidebar cũ phiên bản M3, đã chuẩn hóa sang `AppSidebar.jsx`).
3. ❌ **Đã xóa:** `src/pages/LoginPage.css` (CSS thừa từ template cũ không sử dụng, đã chuyển 100% sang Tailwind).
4. ❌ **Đã xóa:** `src/pages/warehouse/WarehousePage.css` (quy tắc toggle switch đã được tích hợp tập trung vào `src/index.css`).
5. ✅ **Chuẩn hóa dùng chung (Common Components):**
   - [`ConfirmDialog.jsx`](file:///d:/smart-inventory-management-system/frontend/src/components/common/ConfirmDialog.jsx): Dialog xác nhận hành động xoá/thay đổi trạng thái đẹp mắt, loại bỏ hoàn toàn việc gọi `window.confirm()` thô sơ của trình duyệt.
   - [`ToastNotification.jsx`](file:///d:/smart-inventory-management-system/frontend/src/components/common/ToastNotification.jsx): Thông báo nổi thời gian thực dùng chung cho toàn bộ các trang.
   - Bộ khung layout chuẩn: [`AppLayout.jsx`](file:///d:/smart-inventory-management-system/frontend/src/components/AppLayout.jsx), [`AppHeader.jsx`](file:///d:/smart-inventory-management-system/frontend/src/components/AppHeader.jsx), [`AppSidebar.jsx`](file:///d:/smart-inventory-management-system/frontend/src/components/AppSidebar.jsx).

---

## 🎨 3. Hệ Thống Hóa Toàn Bộ Giao Diện Phía Frontend (Đồng bộ 100% Giữa Các Thành Viên)

Cả 4 màn hình Master Data hiện nay tuân thủ chặt chẽ và nhất quán cùng một ngôn ngữ thiết kế **Material You / Enterprise WMS**:

### 1. Phân hệ Quản lý Chi nhánh Kho (`/warehouses` - M4)
- [`WarehousePage.jsx`](file:///d:/smart-inventory-management-system/frontend/src/pages/warehouse/WarehousePage.jsx):
  - 4 thẻ KPI tính động (Tổng số kho, Tổng diện tích m², Tỷ lệ lấp đầy, Kho bảo trì).
  - Thanh tìm kiếm + 3 bộ lọc (Khu vực, Loại hình kho, Trạng thái vận hành) + Thao tác hàng loạt.
  - Bảng danh mục kho với switch toggle trạng thái, modal 4 tab thêm/sửa, dialog xác nhận thay đổi trạng thái kèm nhập lý do.

### 2. Phân hệ Quản lý Danh mục Sản phẩm SKU (`/products` - M3)
- [`ProductPage.jsx`](file:///d:/smart-inventory-management-system/frontend/src/pages/product/ProductPage.jsx):
  - 4 thẻ KPI tổng quan: Tổng số SKU, Mặt hàng đang kinh doanh, Mã vạch GS1/EAN chuẩn hóa (100%), Cảnh báo mức tồn an toàn (Min Stock).
  - Thanh tìm kiếm (SKU/Barcode/Tên) + Lọc theo Ngành hàng + Lọc theo Trạng thái kinh doanh.
  - Nút xuất file Excel, nút làm mới dữ liệu, nút in mã vạch hàng loạt khi chọn nhiều sản phẩm.
  - Bảng hiển thị SKU, Barcode EAN, Tên & ĐVT, Ngành hàng & NCC, Giá nhập & Giá bán (VNĐ), Ngưỡng Min~Max, Chip trạng thái và Modal Thêm/Sửa.
  - Sử dụng [`ConfirmDialog`](file:///d:/smart-inventory-management-system/frontend/src/components/common/ConfirmDialog.jsx) khi xóa.

### 3. Phân hệ Nhóm & Phân loại Hàng hóa (`/categories` - M3)
- [`CategoryPage.jsx`](file:///d:/smart-inventory-management-system/frontend/src/pages/category/CategoryPage.jsx):
  - 4 thẻ KPI tổng quan: Tổng số nhóm phân loại, Nhóm điện tử & viễn thông, Nhóm máy tính & linh kiện, Nhóm cơ khí & tiêu dùng.
  - Thanh tìm kiếm theo mã/tên/mô tả + chọn hàng loạt để in nhãn.
  - Nút xuất file Excel, làm mới dữ liệu, thêm mới danh mục.
  - Bảng danh mục với mã Code Mono, Tên, Mô tả line-clamp, Ngày tạo, Thao tác sửa/xóa với [`ConfirmDialog`](file:///d:/smart-inventory-management-system/frontend/src/components/common/ConfirmDialog.jsx).

### 4. Phân hệ Nhà cung cấp Đối tác (`/suppliers` - M3)
- [`SupplierPage.jsx`](file:///d:/smart-inventory-management-system/frontend/src/pages/supplier/SupplierPage.jsx):
  - 4 thẻ KPI tổng quan: Tổng số đối tác cung ứng, Đang hợp tác (Active), Độ tin cậy cam kết cao (≥95%), Lead time giao hàng TB (ngày).
  - Thanh tìm kiếm đối tác + Lọc trạng thái hợp tác + Đặt lại bộ lọc.
  - Nút xuất file Excel, làm mới dữ liệu, thêm mới NCC.
  - Bảng hiển thị mã NCC, Tên công ty, Người liên hệ, Email/SĐT, Thời gian giao hàng, Thanh tiến trình độ tin cậy %, Chip trạng thái và Thao tác sửa/xóa với [`ConfirmDialog`](file:///d:/smart-inventory-management-system/frontend/src/components/common/ConfirmDialog.jsx).

---

## 🔒 4. Hệ Thống Xác Thực & Bảo Mật Tuyến Đường (Auth Guard)

- [`ProtectedRoute.jsx`](file:///d:/smart-inventory-management-system/frontend/src/components/ProtectedRoute.jsx): Bảo vệ 100% các phân hệ bên trong (`/warehouses`, `/products`, `/categories`, `/suppliers`, `/dashboard`, ...). Chưa đăng nhập lập tức bị điều hướng về `/login`.
- [`LoginPage.jsx`](file:///d:/smart-inventory-management-system/frontend/src/pages/LoginPage.jsx): Giao diện đăng nhập chuẩn Figma kèm 3 thẻ **"Đăng nhập mẫu 1-Click"** (Admin, Warehouse Manager, Staff).
- [`AppHeader.jsx`](file:///d:/smart-inventory-management-system/frontend/src/components/AppHeader.jsx): Menu người dùng góc trên phải hiển thị avatar, tên, vai trò và nút **Đăng xuất** an toàn.

---

## 🧪 5. Kết Quả Kiểm Thử Toàn Diện

- **Frontend Production Build (`npm run build`):**  
  `✓ 126 modules transformed. dist/ created with 0 warnings, 0 errors in 1.52s.`
- **Backend Test Suite (`./mvnw test`):**  
  `Tests run: 28, Failures: 0, Errors: 0, Skipped: 0 — BUILD SUCCESS (100% PASS)`
  - `WarehouseControllerTest`: 9/9 PASS
  - `ProductControllerTest`: 5/5 PASS
  - `CategoryControllerTest`: 5/5 PASS
  - `SupplierControllerTest`: 5/5 PASS
  - `GlobalExceptionHandlerTest`: 4/4 PASS

---

---

# 🚨 KẾ HOẠCH KHÔI PHỤC MASTER — GHI ĐÈ CODE CHUẨN LÊN NHÁNH MASTER

> **Tình huống:** Thành viên Sang Le đã push thẳng code bị lỗi lên nhánh `master` mà không qua nhánh riêng, gây hỏng codebase chung.  
> **Mục tiêu:** Khôi phục nhánh `master` trên remote về đúng trạng thái code chuẩn của nhánh `phutrong` (commit `6c835e0`).  
> **⚠️ CẢNH BÁO:** Thao tác `git push --force` sẽ **ghi đè lịch sử** trên `origin/master`. Thông báo cho nhóm trưởng và các thành viên trước khi thực hiện.

---

## 📋 BƯỚC 0 — Chuẩn Bị & Thông Báo Nhóm

**Trước khi làm bất kỳ thao tác Git nào, hãy:**

1. Nhắn tin cho nhóm trưởng và toàn nhóm trên kênh liên lạc chung (Zalo/Discord/...):
   > 🚨 **THÔNG BÁO KHẨN:** Nhánh `master` đang bị lỗi do code của Sang Le. Mình sẽ tiến hành khôi phục lại master về code chuẩn của sprint 3 trong vài phút tới.  
   > **Yêu cầu:** Tất cả mọi người **DỪNG push code** và **KHÔNG pull master** cho đến khi được thông báo hoàn tất. 🙏

2. Chờ xác nhận từ nhóm trưởng trước khi sang bước 1.

---

## 📋 BƯỚC 1 — Commit Toàn Bộ Thay Đổi Chưa Lưu Trên Nhánh `phutrong`

> Hiện tại có 5 file đang bị `modified` chưa được commit. Phải commit hết trước khi tiếp tục.

Mở terminal tại thư mục gốc dự án và chạy lần lượt:

```bash
# Kiểm tra lại các file thay đổi (đảm bảo bạn đang ở nhánh phutrong)
git status

# Stage toàn bộ thay đổi
git add .

# Commit với message rõ ràng
git commit -m "fix(frontend): finalize and save all local changes before master restore"

# Đẩy lên remote nhánh phutrong để lưu trữ an toàn
git push origin phutrong
```

✅ **Kiểm tra thành công:** Lệnh `git status` báo `nothing to commit, working tree clean`.

---

## 📋 BƯỚC 2 — Xác Nhận Bạn Đang Ở Nhánh `phutrong` Với Code Chuẩn

```bash
# Kiểm tra nhánh hiện tại (phải là phutrong)
git branch

# Xem commit mới nhất (phải thấy commit "feat(master-data): synchronize..." hoặc commit vừa tạo)
git log --oneline -5

# Kiểm tra không còn file thay đổi nào
git status
```

✅ **Kiểm tra thành công:** Đầu ra `git branch` có dấu `*` ở dòng `phutrong`.

---

## 📋 BƯỚC 3 — Chuyển Sang Nhánh `master` Local Và Cập Nhật

```bash
# Chuyển sang nhánh master local
git checkout master

# Fetch code mới nhất từ remote (chưa merge)
git fetch origin

# Kiểm tra trạng thái master bị lỗi (xem commit của Sang Le)
git log --oneline -5
```

---

## 📋 BƯỚC 4 — Ghi Đè Master Bằng Code Từ Nhánh `phutrong`

> Đây là bước **cốt lõi** — reset nhánh `master` local về đúng trạng thái của `phutrong`.

```bash
# Reset CỨNG nhánh master local về đúng HEAD của nhánh phutrong
git reset --hard phutrong
```

> **Giải thích lệnh:**  
> `git reset --hard phutrong` — Di chuyển con trỏ HEAD của nhánh `master` về commit mới nhất của `phutrong`, **xóa hoàn toàn** mọi thay đổi của Sang Le trên master local.

✅ **Kiểm tra thành công:** Lệnh `git log --oneline -3` cho thấy commit đầu tiên là commit của bạn `6c835e0`, **không phải** commit của Sang Le.

---

## 📋 BƯỚC 5 — Force Push Lên Remote `origin/master`

> ⚠️ **QUAN TRỌNG:** Lệnh này sẽ **ghi đè vĩnh viễn** lịch sử của `origin/master`. Chỉ thực hiện khi đã xác nhận bước 4 đúng.

```bash
# Force push — ghi đè origin/master bằng master local hiện tại
git push origin master --force
```

✅ **Kiểm tra thành công:** Terminal báo `Branch 'master' set up to track remote branch 'master' from 'origin'` hoặc tương tự.

---

## 📋 BƯỚC 6 — Xác Minh Kết Quả Trên GitHub

1. Mở trình duyệt, truy cập:  
   👉 `https://github.com/FelixLe2210/smart-inventory-management-system`

2. Chuyển sang tab **"Commits"** của nhánh `master`.

3. Kiểm tra:
   - ✅ Commit mới nhất phải là: `feat(master-data): synchronize Master Data UI...` (hash `6c835e0` hoặc commit mới hơn).
   - ❌ Commit của Sang Le **KHÔNG được xuất hiện** ở đầu danh sách.

---

## 📋 BƯỚC 7 — Thông Báo Nhóm Pull Code Mới

Sau khi xác minh GitHub đã cập nhật đúng, nhắn tin cho nhóm:

> ✅ **HOÀN TẤT:** Nhánh `master` đã được khôi phục về code chuẩn Sprint 3.  
> Tất cả mọi người hãy chạy lệnh sau để cập nhật:
>
> ```bash
> git checkout master
> git pull origin master --rebase
> ```
>
> Nếu ai đang làm việc trên nhánh riêng, chạy thêm:
>
> ```bash
> git rebase master
> ```
>
> Gặp conflict hãy báo ngay để hỗ trợ! 🙏

---

## 📋 BƯỚC 8 — Quay Lại Nhánh Làm Việc Của Bạn

```bash
# Quay về nhánh phutrong để tiếp tục phát triển
git checkout phutrong
```

---

## ⚠️ LƯU Ý Sau Khi Hoàn Tất

| # | Vấn đề | Hành động |
|---|--------|-----------|
| 1 | **Sang Le cần làm gì?** | Sang Le chạy `git checkout sangle` → `git rebase master`, giải quyết conflict rồi mới tạo Pull Request. KHÔNG push thẳng lên master. |
| 2 | **Thành viên khác bị conflict?** | Mỗi người `git pull origin master --rebase` trên nhánh riêng, giải quyết conflict thủ công. |
| 3 | **Bảo vệ master về sau?** | Nhóm trưởng bật **Branch Protection** trên GitHub: Settings → Branches → Add rule cho `master` → bật `Require pull request reviews before merging`. |
| 4 | **Lịch sử Git bị mất?** | Commit của Sang Le không còn trên `master`, nhưng vẫn còn trên nhánh `sangle` — không mất vĩnh viễn. |

---

## 🔄 Tóm Tắt Toàn Bộ Lệnh (Cheat Sheet)

```bash
# ---- BƯỚC 1: Lưu code hiện tại trên phutrong ----
git add .
git commit -m "fix(frontend): finalize and save all local changes before master restore"
git push origin phutrong

# ---- BƯỚC 2: Chuyển sang master local ----
git checkout master
git fetch origin

# ---- BƯỚC 3: Ghi đè master bằng code phutrong ----
git reset --hard phutrong

# ---- BƯỚC 4: Force push lên remote ----
git push origin master --force

# ---- BƯỚC 5: Quay lại nhánh làm việc ----
git checkout phutrong
```

> **Thời gian ước tính:** 5–10 phút  
> **Người thực hiện:** Phú Trọng (chủ nhánh `phutrong`)  
> **Người phê duyệt:** Nhóm trưởng (xác nhận trước bước 5)

---

### Kế hoạch & Lịch sử Đồng bộ Nhánh Sprint 4

- **Thời gian đồng bộ:** 10:37 ngày 08/10/2026 (GMT+7)
- **Nhánh thực hiện:**
  - Nhánh chính của dự án: `master` (nhánh chính gốc trên remote repository)
  - Nhánh làm việc nhận cập nhật: `phutrong`
- **Trạng thái trước khi gộp:**
  - Nhánh `phutrong` sạch sẽ (`working tree clean`), không có file uncommitted nên không cần commit backup thêm.
- **Kết quả merge:**
  - **Thành công hoàn toàn (Fast-forward)** từ commit `4e1373f` lên `8ec1545` (tổng cộng 14 commits mới nhất).
  - **Xung đột (Conflict):** **0 conflict**. Không có xung đột mã nguồn.
  - Cập nhật 36 files (bao gồm cấu hình Spring Security JWT, DTO & Controller Warehouse, migration Flyway V3/V4, các unit/integration test backend và tối ưu giao diện frontend).

#### Danh sách các lệnh Git đã thực hiện:
```bash
# 1. Kiểm tra trạng thái làm việc trên nhánh phutrong
git status
git branch -a

# 2. Lấy thông tin commit mới nhất từ toàn bộ các nhánh remote
git fetch origin

# 3. Chuyển sang nhánh chính (master) và kéo mã nguồn mới nhất về
git checkout master
git pull origin master

# 4. Quay lại nhánh làm việc cá nhân (phutrong) và hợp nhất code từ nhánh chính
git checkout phutrong
git merge master
```

---

## 🚀 SPRINT 4 — TIẾN ĐỘ THỰC HIỆN MILESTONE M1

| ID | TV | Product Backlog / Card | Effort (h) | Type | Trạng thái | Nội dung đã triển khai |
|:---:|:---:|:---|:---:|:---:|:---:|:---|
| **Sprint4-01** | M1 | **Inventory Entity & Business Logic** | 6 | BE | ✅ Hoàn thành | Xây dựng Entity `Inventory` ánh xạ bảng `inventories`, tích hợp quan hệ `Product` & `Warehouse`, logic tính tồn kho khả dụng `availableStock = currentStock - reservedStock`, xác định cảnh báo tồn `LOW_STOCK`, `OUT_OF_STOCK`, `OVER_STOCK`. |
| **Sprint4-02** | M1 | **Inventory API** | 5 | BE / API | ✅ Hoàn thành | Xây dựng REST API chuẩn hóa: `GET /api/inventories` (hỗ trợ lọc `productId`, `warehouseId`, `lowStock`), `GET /api/inventories/{id}`, `GET /api/inventories/product/{productId}/warehouse/{warehouseId}`, `GET /api/inventories/low-stock`, `POST /api/inventories`, `PUT /api/inventories/{id}`, `POST /api/inventories/{id}/adjust`. |
| **Sprint4-03** | M1 | **Stock Validation Rules** | 3 | BE | ✅ Hoàn thành | Triển khai bộ quy tắc kiểm soát tồn kho chặt chẽ: Chống âm kho (`currentStock >= 0`, `reservedStock >= 0`), đảm bảo `reservedStock <= currentStock`, ngăn xuất kho vượt tồn khả dụng (`INSUFFICIENT_STOCK`), kiểm tra trạng thái kho (`WAREHOUSE_NOT_ACTIVE`), chống trùng lặp `(product, warehouse)`. |
| **Sprint4-04** | M1 | **Inventory API Testing** | 3 | Testing | ✅ Hoàn thành | Viết bộ kiểm thử toàn diện: `InventoryServiceTest` (15/15 unit tests) & `InventoryControllerTest` (7/7 MockMvc tests). Toàn bộ hệ thống Backend đạt **63/63 tests PASS 100%**. Frontend build hoàn tất không lỗi. |

---

### 📦 Lịch Sử Commit & Đồng Bộ Remote Nhánh `phutrong`

- **Thời gian đẩy code:** 11:31 ngày 08/10/2026 (GMT+7)
- **Mã commit (Commit SHA):** `a0e1573`
- **Commit Message:** `feat(M1): implement Sprint 4 inventory entity, api, validation and tests`
- **Nhánh đẩy:** `phutrong` ➔ `origin/phutrong`
- **Chi tiết 11 files đã triển khai & đưa lên remote:**
  1. [`Inventory.java`](file:///d:/smart-inventory-management-system/backend/src/main/java/com/smartinventory/model/Inventory.java) — Entity ánh xạ bảng `inventories`, tích hợp tính toán tồn khả dụng & trạng thái cảnh báo.
  2. [`InventoryRepository.java`](file:///d:/smart-inventory-management-system/backend/src/main/java/com/smartinventory/repository/InventoryRepository.java) — Repository với truy vấn JOIN FETCH tối ưu.
  3. [`InventoryResponse.java`](file:///d:/smart-inventory-management-system/backend/src/main/java/com/smartinventory/dto/InventoryResponse.java) — Record DTO phản hồi dữ liệu tồn kho đầy đủ.
  4. [`InventoryCreateRequest.java`](file:///d:/smart-inventory-management-system/backend/src/main/java/com/smartinventory/dto/InventoryCreateRequest.java) — DTO tiếp nhận khởi tạo tồn kho ban đầu.
  5. [`InventoryUpdateRequest.java`](file:///d:/smart-inventory-management-system/backend/src/main/java/com/smartinventory/dto/InventoryUpdateRequest.java) — DTO cập nhật vị trí/kiểm kê.
  6. [`InventoryAdjustRequest.java`](file:///d:/smart-inventory-management-system/backend/src/main/java/com/smartinventory/dto/InventoryAdjustRequest.java) — DTO điều chỉnh kho (IN/OUT/SET/RESERVE/RELEASE).
  7. [`InventoryService.java`](file:///d:/smart-inventory-management-system/backend/src/main/java/com/smartinventory/service/InventoryService.java) — Service xử lý business logic & toàn bộ Stock Validation Rules (chống âm kho, kiểm tra kho active).
  8. [`InventoryController.java`](file:///d:/smart-inventory-management-system/backend/src/main/java/com/smartinventory/controller/InventoryController.java) — REST Controller đầy đủ endpoints chuẩn REST API.
  9. [`InventoryServiceTest.java`](file:///d:/smart-inventory-management-system/backend/src/test/java/com/smartinventory/service/InventoryServiceTest.java) — 15 Unit tests nghiệp vụ và validation rules (100% PASS).
  10. [`InventoryControllerTest.java`](file:///d:/smart-inventory-management-system/backend/src/test/java/com/smartinventory/controller/InventoryControllerTest.java) — 7 MockMvc tests cho API tồn kho (100% PASS).
  11. [`plan.md`](file:///d:/smart-inventory-management-system/plan.md) — Tài liệu theo dõi kế hoạch, tiến độ M1 và lịch sử đồng bộ.

#### Các lệnh Git đã chạy:
```bash
git add .
git commit -m "feat(M1): implement Sprint 4 inventory entity, api, validation and tests"
git push origin phutrong
```



