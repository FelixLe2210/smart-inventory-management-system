# Báo cáo kiểm thử

Cập nhật: 08/11/2026. Phạm vi: toàn hệ thống, gồm cả màn hình quản lý người dùng và vai trò.

## 1. Tổng quan kết quả tự động

| Thành phần | Công cụ | Số test | Kết quả | Lệnh chạy |
|---|---|---:|---|---|
| Backend (Spring Boot) | JUnit 5, MockMvc, H2 | 257 | Đạt (0 lỗi, 0 bỏ qua, 08/11/2026) | `cd backend; .\mvnw.cmd test` |
| Frontend (React) | `node --test` | 131 | Đạt | `cd frontend; npm test` |
| AI service (FastAPI) | pytest | 239 | Đạt |  `cd ai-service; python -m pytest -q` |
| Build frontend | Vite | n/a | Thành công | `cd frontend; npm run build` |

CI (`.github/workflows/ci.yml`) chạy ba nhóm test trên mỗi lần đẩy lên `master`/`vinhtu` và mỗi pull request.

> Số test là số lần chạy gần nhất trên máy phát triển (08/11/2026). Nếu `mvnw test` báo "forked VM terminated" kèm `hs_err_pid*.log` thì máy thiếu RAM: tắt bớt Docker/backend rồi chạy lại với `-DargLine=-Xmx768m`.

## 2. Kiểm thử tích hợp (script, cần backend đang chạy)

| Script | Kiểm tra | Lệnh |
|---|---|---|
| `docs/api/inventory-e2e.mjs` | Luồng tồn kho cơ bản | `node docs/api/inventory-e2e.mjs` |
| `docs/api/stock-movement-e2e.mjs` | Nhập, xuất, chuyển kho và số dư | `node docs/api/stock-movement-e2e.mjs` |
| `docs/api/concurrency-check.mjs` | Nhiều yêu cầu xuất kho đồng thời không làm tồn âm | `node docs/api/concurrency-check.mjs` |
| `docs/api/realtime-e2e.mjs` | Sự kiện WebSocket sau khi đổi tồn kho | `node docs/api/realtime-e2e.mjs` |
| `deploy/sample-data/check_data_readiness.sql` | Dữ liệu mẫu nhất quán (số dư, lịch sử đủ) | chạy trong SSMS |

## 3. Kiểm thử thủ công theo chức năng

Đánh dấu Đạt hoặc Lỗi khi thực hiện. Tài khoản: `admin/Admin@123` (ADMIN), `tester/Tester@123` (MANAGER), `staff/Staff@123` (STAFF).

| Mã | Chức năng | Các bước | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|
| T01 | Đăng nhập | Nhập đúng tài khoản | Vào Tổng quan | |
| T02 | Đăng nhập sai | Nhập sai mật khẩu | Thông báo lỗi rõ ràng, không vào hệ thống | |
| T03 | Chế độ sáng/tối | Bấm nút đổi giao diện, tải lại trang | Giao diện giữ lựa chọn | |
| T04 | Tổng quan | Mở Tổng quan | Các thẻ số liệu và biểu đồ hiển thị đúng số của dữ liệu mẫu | |
| T05 | Tồn kho | Mở Tồn kho, lọc theo kho | Danh sách khớp với kho đã chọn | |
| T06 | Nhập kho | Nhập 10 cái SI-MOUSE | Tồn tăng đúng 10, có giao dịch RECEIVING | |
| T07 | Xuất kho vượt tồn | Xuất nhiều hơn tồn | Bị chặn, báo lỗi, tồn không đổi | |
| T08 | Chuyển kho | Chuyển 5 cái sang kho khác | Kho nguồn giảm 5, kho đích tăng 5 | |
| T09 | Cảnh báo thời gian thực | Xuất kho cho đến khi dưới mức tối thiểu (mở hai cửa sổ) | Cửa sổ kia hiện thông báo trên chuông, không cần tải lại | |
| T10 | Dự báo (dữ liệu thật) | Mở Dự báo, chọn SI-MOUSE | Nhãn "Dựa trên lịch sử bán thật", đường dự báo theo doanh số | |
| T11 | Dự báo (thiếu lịch sử) | Chọn SI-FAN | Nhãn "Chưa đủ lịch sử bán · dữ liệu mẫu" | |
| T12 | Đề xuất đặt hàng | Bấm Tính đề xuất bằng AI | Kết quả khớp bảng ở `docs/PRESENTATION_GUIDE.md` | |
| T13 | Tạo đơn từ đề xuất | Bấm Tạo đơn trên SI-MOUSE | Có đơn Nháp liên kết đề xuất | |
| T14 | Vòng đời đơn | Gửi, nhận một phần, nhận đủ | Trạng thái đổi đúng, tồn kho tăng đúng số đã nhận | |
| T15 | Nhận vượt số lượng | Nhập số nhận lớn hơn phần còn lại | Bị chặn | |
| T16 | Hủy đơn đã nhận một phần | Bấm Hủy | Bị chặn, báo đúng lý do | |
| T17 | Cập nhật tức thì của đơn | Mở trang Đơn đặt hàng ở hai cửa sổ, gửi một đơn ở cửa sổ thứ nhất | Cửa sổ thứ hai đổi trạng thái và có thông báo | |
| T18 | Phân quyền STAFF | Đăng nhập `staff` | Không thấy nút thêm/sửa/xóa danh mục, tạo/sửa/gửi/hủy đơn; vẫn thấy Nhận hàng | |
| T19 | Phân quyền MANAGER | Đăng nhập `tester` | Thấy đầy đủ các nút trên | |
| T20 | Quyền ở backend | Gọi `POST /api/products` bằng token STAFF | 403 `FORBIDDEN` | |
| T21 | Lỗi API | Gọi sai phương thức, sai đường dẫn | 405 `METHOD_NOT_ALLOWED`, 404 `ENDPOINT_NOT_FOUND` | |
| T22 | Mất kết nối real-time | Tắt backend 30 giây rồi bật lại | Giao diện tự kết nối lại | |
| T23 | AI service tắt | Tắt AI service, mở Dự báo | Thông báo lỗi rõ ràng, hệ thống không treo | |
| T24 | Người dùng và vai trò (ADMIN) | Đăng nhập `admin`, mở Người dùng và vai trò | Thấy danh sách tài khoản, bộ lọc và ô tìm kiếm hoạt động | |
| T25 | Đổi vai trò | Đăng ký tài khoản mới (VIEWER), ADMIN đổi thành Nhân viên kho, tài khoản đó đăng nhập lại | Thấy các mục Nhập, Xuất, Chuyển kho | |
| T26 | Khóa tài khoản | ADMIN khóa một tài khoản rồi tài khoản đó đăng nhập | Báo tài khoản bị vô hiệu hóa; mở khóa thì đăng nhập lại được | |
| T27 | Bảo vệ quản trị viên | ADMIN thử đổi vai trò hoặc khóa chính mình | Ô chọn và nút bị vô hiệu hóa; gọi API trả 409 `CANNOT_MODIFY_SELF` | |
| T28 | Ẩn trang với người không phải ADMIN | Đăng nhập `tester` hoặc `staff` | Không thấy mục Người dùng và vai trò; vào `/users` bị đưa về Tổng quan; `GET /api/users` trả 403 | |

## 4. Hạn chế đã biết

1. Dữ liệu mẫu và dữ liệu huấn luyện AI là **mô phỏng**. Độ chính xác đo được không phải độ chính xác trên dữ liệu bán hàng thật.
2. Trên dataset Kaggle, Random Forest (MAE 6,31) vượt baseline tốt nhất (9,37) khoảng 33%, nhưng đo ở mức dự báo trước một ngày; sai số theo độ dài dự báo 7 đến 30 ngày chưa được đo. Mô hình triển khai chưa được huấn luyện trên dataset này (xem `docs/ai/MODEL_EVALUATION_KAGGLE.md`). Trên dữ liệu mô phỏng, baseline nhỉnh hơn Random Forest (2,374 so với 2,395).
3. Kênh WebSocket dùng bộ nhớ của một tiến trình: chạy nhiều bản backend cần thêm bộ trung gian tin nhắn.
4. Kiểm thử giao diện từng trang ở chế độ tối mới ở mức kiểm tra bằng mắt; chưa có test giao diện tự động.
5. Docker chưa được kiểm tra lại trên máy sạch trong giai đoạn này.
