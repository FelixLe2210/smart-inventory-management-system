# Dashboard · Alert · Report – Nghiệm thu (Sprint 6 · M4)

Phạm vi: **Sprint6-13** Alert UI · **Sprint6-14** Report UI · **Sprint6-15** Dashboard API Integration · **Sprint6-16** Dashboard Acceptance Testing.

## 1. Test tự động

```bash
cd frontend && npm test      # Node >= 18, không cần cài thêm
```

| File | Nội dung |
|---|---|
| `dashboard.test.mjs` | KPI, phân bổ danh mục, tồn theo kho, thống kê giao dịch (M3) |
| `stockAlerts.test.mjs` | Biên Low/Out of Stock, tổng hợp nhiều kho, giữ chỗ, sản phẩm không có tồn / INACTIVE, sắp xếp, lọc, **KPI ↔ danh sách cảnh báo luôn khớp**, đọc `currentStock` của backend, contract Alert API, quy tắc fallback (chỉ 404/405/501) |
| `reports.test.mjs` | Lọc ngày (gồm cả ngày cuối), lọc kho không đếm đôi chuyển kho, loại giao dịch trùng id, `netChange`, báo cáo tồn kho (số lượng/giá trị/trạng thái), **báo cáo tồn kho ↔ KPI khớp tổng**, xác thực contract, CSV (escape, chống formula injection) |

## 2. Kịch bản nghiệm thu thủ công

Chuẩn bị: backend chạy profile `dev`, đăng nhập `admin / Admin@123`. Tạo dữ liệu mẫu (Sản phẩm **A** Min=10; **B** Min=20; **C** Min=5; **D** Min=10) rồi:

| # | Thao tác | Kết quả mong đợi |
|---|---|---|
| A1 | Nhập kho A: kho HCM 6, kho HN 5 | Dashboard & `/alerts` **không** cảnh báo A (tổng 11 > Min 10) |
| A2 | Xuất kho A 2 đơn vị ở HN (còn 3, tổng 9) | A xuất hiện "Sắp hết hàng", khả dụng 9/10, thiếu hụt −1, hiện 2 chip kho |
| A3 | B nhập 15 (Min 20) | B "Sắp hết", thiếu hụt −5 |
| A4 | C chưa khai báo tồn ở kho nào | C "Hết hàng", cột Theo kho: "Chưa có tồn tại kho nào" |
| A5 | D nhập 30, điều chỉnh giữ chỗ (RESERVE) 30 | D "Hết hàng" (khả dụng 0 dù tồn 30) |
| A6 | Đặt sản phẩm B sang INACTIVE | B biến mất khỏi cảnh báo và KPI |
| A7 | Bấm thẻ "Hết hàng" / "Sắp hết hàng" / ô tìm kiếm / "Đặt lại" | Danh sách lọc đúng; lọc không khớp hiện "Không có cảnh báo nào khớp bộ lọc" |
| A8 | Dashboard so với `/alerts` | KPI "Hàng sắp hết" = số dòng Low Stock; KPI "Hết hàng" = số dòng Out of Stock; thẻ cảnh báo ghi "Xem tất cả N cảnh báo" khi N > 6 |
| A9 | Nhập đủ hàng cho mọi sản phẩm | `/alerts` hiện "Kho hàng ổn định" |
| R1 | `/reports` → Báo cáo tồn kho, không lọc | Tổng tồn / giá trị **bằng** KPI Dashboard (Tổng lượng tồn kho, Giá trị tài sản) |
| R2 | Lọc theo kho / danh mục / trạng thái / từ khóa | Bảng và 5 thẻ tổng hợp cùng đổi; "Dòng tồn kho" = số dòng trong bảng |
| R3 | Báo cáo giao dịch: thực hiện 1 nhập 100, 1 xuất 30, 1 chuyển 20 (HN→HCM) | Nhập +100, Xuất −30, **Chuyển kho 20** (không phải 40), Biến động ròng +70 |
| R4 | Lọc kho HN ở R3 | Biến động ròng 50 (100 − 30 − 20); kho HCM = +20 |
| R5 | Đặt "Từ ngày = Đến ngày = hôm nay" | Gồm cả giao dịch phát sinh lúc 23:59 hôm nay |
| R6 | Bấm "Xuất CSV" ở cả hai tab | File tải về, mở bằng Excel hiển thị đúng tiếng Việt, số dòng = số dòng đã lọc |
| I1 | Tắt backend rồi bấm "Làm mới" ở Dashboard/Alerts/Reports | Hiện banner lỗi + nút "Thử lại" (không trắng trang) |
| I2 | Backend chưa có `/api/alerts/stock`, `/api/dashboard/kpis`, `/api/reports/*` | Mọi trang vẫn chạy; badge "Nguồn số liệu: Tính tại client" |
| I3 | Backend có đủ API theo `DASHBOARD_API_CONTRACT.md` | Badge chuyển "Backend API"; số liệu khớp client-side ở A8/R1 |
| I4 | Backend trả 500 ở một API tổng hợp | Banner vàng "…API gặp lỗi — đang hiển thị số liệu tính từ dữ liệu tồn kho", trang vẫn dùng được |
| I5 | Bấm "Làm mới" liên tục nhiều lần | Không nhấp nháy/ghi đè dữ liệu cũ (chỉ lần gọi mới nhất được áp dụng) |

## 3. Kết quả đã kiểm chứng

- `npm test`: **65/65** test pass (gồm 10 + 14 test mới cho cảnh báo/báo cáo).
- Render thử (SSR, dữ liệu mẫu) `AlertsPage`, `ReportsPage` (cả hai tab), `DashboardPage` ở các trạng thái có dữ liệu / rỗng / đang tải / lỗi / cảnh báo một phần / nguồn backend: không lỗi runtime, không có `undefined`/`NaN` trong HTML.
- Lớp `dashboardApi` kiểm thử với `httpClient` giả lập: 404/405/501 → fallback; 401/403/500/mất mạng → ném lỗi; một nguồn dữ liệu lỗi không hỏng nguồn khác; loại giao dịch trùng id; giới hạn đồng thời request.
- **Chưa kiểm chứng**: chạy trên trình duyệt thật với backend thật (môi trường kiểm thử không có Vite binary/mạng/DB). Cần chạy mục 2 ở máy dev trước khi đóng thẻ Sprint6-16.

## 4. Lỗi M3 được sửa trong đợt này

`utils/dashboard.js` (M3) đọc `item.quantity`, nhưng `InventoryResponse` của backend trả `currentStock` → với dữ liệu thật, **Tổng lượng tồn kho, Giá trị tài sản, biểu đồ theo kho/danh mục đều ra 0**. Test M3 không phát hiện vì dùng dữ liệu giả có trường `quantity`. Đã sửa (vẫn tương thích `quantity` cũ) và thêm test hồi quy `calculateKpis - đọc currentStock của backend`.

## 5. Hạn chế đã biết

- Chưa có endpoint "tất cả giao dịch": báo cáo giao dịch ở chế độ client phải gọi `/inventories/{id}/transactions` cho **từng** dòng tồn kho (theo đợt 6 request). Với kho lớn nên dùng Transaction Report API (Sprint6-06). Dashboard chỉ lấy 15 dòng tồn mới cập nhật nhất cho "Giao dịch gần đây".
- Bảng báo cáo hiển thị tối đa 200 dòng; số liệu tổng hợp và file CSV luôn tính trên toàn bộ.
- Định nghĩa cảnh báo (theo sản phẩm, tồn khả dụng) khác trạng thái từng dòng tồn ở trang Tồn kho — xem `DASHBOARD_API_CONTRACT.md` mục 1.
