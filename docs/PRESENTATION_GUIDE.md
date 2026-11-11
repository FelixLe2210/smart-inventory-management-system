# Kịch bản trình bày và câu hỏi bảo vệ

## 1. Chuẩn bị (làm trước buổi trình bày 30 phút)

1. Bật SQL Server, chạy `deploy/sample-data/reset_sample_data.sql` rồi `seed_sample_data.sql`, `seed_sample_extra.sql` (hoặc `docker compose --profile tools run --rm db-seed` nếu chạy bằng Docker; với SQL Server cài trực tiếp dùng `sqlcmd -I -f 65001` như trong `OPERATIONS_GUIDE.md`); kiểm tra bằng `check_data_readiness.sql` (cột `so_dong_loi` đều bằng 0).
2. Bật hệ thống bằng Docker (`docker compose up -d`, giao diện ở `http://localhost:8081`) hoặc chạy từng phần khi phát triển (AI service cổng 8000, backend cổng 8080, frontend cổng 5173).
3. Mở hai cửa sổ trình duyệt: cửa sổ A đăng nhập `admin`, cửa sổ B đăng nhập `staff` (dùng chế độ ẩn danh cho cửa sổ B). Mật khẩu các tài khoản này nằm trong README.
4. Chuẩn bị sẵn: sơ đồ kiến trúc, bảng `docs/ai/POLICY_SIMULATION.md`, kết quả test (`docs/TEST_REPORT.md`).

## 2. Kịch bản 12 phút

| Phút | Làm gì | Nói gì |
|---|---|---|
| 0–1 | Đăng nhập `admin`, mở Tổng quan, bấm đổi sáng/tối | Hệ thống gồm giao diện React, backend Spring Boot, SQL Server và một dịch vụ AI Python tách riêng |
| 1–3 | Cửa sổ B (`staff`) xuất kho SI-MOUSE cho đến dưới mức tối thiểu; nhìn chuông thông báo và thẻ Tổng quan ở cửa sổ A | Tồn kho đổi là mọi người thấy ngay, không cần tải lại. Sự kiện chỉ gửi sau khi giao dịch cơ sở dữ liệu đã commit, nên không có số liệu "ảo" |
| 3–4 | Cửa sổ B: chỉ ra không có nút thêm/sửa/xóa sản phẩm; cửa sổ A có đủ | Phân quyền được áp ở cả giao diện và backend (STAFF gọi API sửa danh mục sẽ nhận 403) |
| 4–6 | Dự báo: chọn SI-MOUSE (nhãn xanh), rồi SI-FAN (nhãn vàng) | Dự báo dùng doanh số xuất kho thật của chính sản phẩm. Sản phẩm thiếu lịch sử thì hệ thống nói rõ là dữ liệu mẫu, không giả vờ chính xác |
| 6–8 | Đề xuất đặt hàng, bấm Tính đề xuất bằng AI, mở Chi tiết SI-MOUSE | Kết quả theo bảng ở mục 3. Giải thích lead time thực tế, tồn an toàn, điểm đặt hàng lại, xác suất hết hàng |
| 8–10 | Bấm Tạo đơn, mở trang Đơn đặt hàng ở cả hai cửa sổ, Gửi đơn ở cửa sổ A | Cửa sổ B tự đổi trạng thái và có thông báo |
| 10–12 | Nhận hàng một phần ở cửa sổ B (STAFF được phép), vào Tồn kho kiểm tra tăng đúng số; thử nhận vượt số lượng và hủy đơn đã nhận một phần | Hệ thống khóa dòng đơn khi nhận hàng nên hai người nhận cùng lúc không thể nhập kho hai lần |

## 3. Kết quả đề xuất mong đợi (dữ liệu mẫu)

| Sản phẩm | Kết quả | Ý nghĩa |
|---|---|---|
| SI-MOUSE | Đặt khoảng 315, Khẩn cấp; lead time thực tế khoảng 9 ngày | Tồn chỉ đủ khoảng 3 ngày; dùng lịch sử giao hàng của nhà cung cấp |
| SI-LAPTOP | Đặt khoảng 48, Khẩn cấp | Lead time 14 ngày, nhà cung cấp kém tin cậy nên tồn an toàn lớn |
| SI-HEADSET | Đặt khoảng 50, Trung bình | Đơn nháp không tính là hàng đang về |
| SI-CABLE | Giục hàng đang về | Đã đặt nhưng hẹn quá muộn |
| SI-MONITOR, KEYBOARD, LAMP | Không đề xuất | Đủ hàng hoặc hàng về kịp |
| SI-FAN | Không đề xuất, kèm cảnh báo | Chỉ 10 ngày lịch sử nên dùng trung bình đơn giản |

Số có thể lệch nhẹ do dữ liệu mô phỏng có nhiễu.

## 4. Câu hỏi hội đồng có thể hỏi

**Độ chính xác của AI #1 là bao nhiêu?**
Trên dataset công khai của Kaggle (500 chuỗi, 2 tháng cuối làm tập kiểm tra), Random Forest đạt MAE 6,31 cái/ngày và WAPE 11,9% khi dự báo trước một ngày, tốt hơn baseline mạnh nhất khoảng 33% (`docs/ai/MODEL_EVALUATION_KAGGLE.md`). Hai giới hạn chúng tôi nói rõ: số này đo ở mức một ngày trong khi sản phẩm dự báo 7 đến 30 ngày nên sai số dài hạn sẽ lớn hơn và chưa được đo; và mô hình đang chạy trong hệ thống chưa được huấn luyện trên dataset đó mà trên dữ liệu mô phỏng của dự án.

**Mô hình học máy có tốt hơn cách tính đơn giản không?**
Có, trên dữ liệu công khai: MAE 6,31 so với 9,37 (lặp lại 7 ngày trước) và 9,72 (trung bình theo thứ trong tuần). Trên dữ liệu mô phỏng của dự án thì không: baseline nhỉnh hơn một chút (2,374 so với 2,395), vì dữ liệu mô phỏng sinh chủ yếu từ quy luật theo tuần. Sự khác biệt cho thấy giá trị của mô hình phụ thuộc vào dữ liệu có xu hướng và biến động thật hay không. Điều kiện để đạt độ chính xác này là có sẵn dữ liệu bán của những ngày gần nhất (bản chỉ dùng đặc trưng lịch kém hơn cả baseline, MAE 16,38).

**Vậy AI #2 (đề xuất đặt hàng) có giá trị gì?**
AI #2 là logic tất định, không phải học máy: nó kết hợp dự báo nhu cầu, lead time thực tế của nhà cung cấp, hàng đang về và tồn an toàn. Trong mô phỏng 120 ngày, để đạt mức phục vụ tương đương, quy tắc min/max cố định cần tồn kho trung bình nhiều hơn khoảng 30 đến 38% (`docs/ai/POLICY_SIMULATION.md`). Cái giá là AI đặt nhiều đơn nhỏ hơn gần gấp đôi, và mô phỏng không tính phí đặt hàng.

**Điều gì xảy ra nếu hai người cùng xuất kho món cuối cùng?**
Hệ thống khóa dòng tồn kho (khóa bi quan) khi ghi, nên yêu cầu thứ hai thấy số đã giảm và bị từ chối thay vì làm tồn âm. Có script `concurrency-check.mjs` để chứng minh.

**Thông báo thời gian thực hoạt động thế nào?**
WebSocket gốc của Spring, xác thực bằng token JWT. Sự kiện phát sau khi giao dịch commit. Giao diện tự kết nối lại với thời gian chờ tăng dần. Hạn chế: bộ nhớ phiên nằm trong một tiến trình, muốn chạy nhiều bản backend cần thêm bộ trung gian tin nhắn như Redis.

**Bảo mật ra sao?**
JWT, ma trận quyền ADMIN/MANAGER/STAFF/VIEWER áp ở backend (có test), tài khoản tự đăng ký chỉ được xem cho tới khi quản trị viên nâng vai trò ở trang Người dùng và vai trò, CORS không dùng ký tự đại diện, các endpoint huấn luyện của AI cần khóa quản trị. Chi tiết ở `docs/SECURITY.md`.

**AI service chết thì sao?**
Backend trả lỗi có mã rõ ràng (`AI_SERVICE_UNAVAILABLE`, `AI_SERVICE_TIMEOUT`); các chức năng kho vẫn chạy bình thường.

**Dữ liệu mẫu có thật không?**
Không, là dữ liệu mô phỏng do nhóm sinh ra, đánh dấu `SI-*` để xóa sạch bằng `reset_sample_data.sql`.

**Nếu có thêm thời gian, làm gì tiếp?**
Dữ liệu bán hàng thật hoặc dataset công khai; đo sai số theo từng độ dài dự báo; lịch tự động tính đề xuất hằng đêm; bước phê duyệt riêng cho đơn đặt hàng; bộ trung gian tin nhắn để chạy nhiều bản backend.
