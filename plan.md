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
