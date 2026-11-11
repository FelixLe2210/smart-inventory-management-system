# Hướng dẫn sử dụng

Hệ thống giúp theo dõi tồn kho, dự báo nhu cầu và đề xuất đặt hàng. Mở `http://localhost:8081` nếu chạy bằng Docker (hoặc `http://localhost:5173` khi chạy chế độ phát triển) và đăng nhập.

## 1. Vai trò

| Vai trò | Làm được |
|---|---|
| ADMIN | Mọi thao tác của MANAGER, cộng quản lý tài khoản: xem danh sách người dùng, đổi vai trò, khóa hoặc mở khóa tài khoản |
| MANAGER | Quản lý kho, sản phẩm, nhóm hàng, nhà cung cấp; tạo, gửi, hủy đơn đặt hàng; tính và chấp nhận đề xuất AI; nhập, xuất, chuyển kho |
| STAFF | Xem dữ liệu; nhập, xuất, chuyển kho; nhận hàng theo đơn đặt hàng |
| VIEWER | Chỉ xem dữ liệu và dự báo. Tài khoản tự đăng ký bắt đầu ở vai trò này; quản trị viên nâng quyền khi cần |

Các nút bạn không có quyền dùng sẽ không hiện trên màn hình.

## 2. Giao diện chung

- **Thanh bên:** chuyển giữa các chức năng, chia theo nhóm Vận hành kho, Dự báo và đặt hàng, Danh mục, Báo cáo (và Quản trị với ADMIN).
- **Nút sáng/tối** ở góc trên: đổi giao diện, hệ thống nhớ lựa chọn.
- **Chuông thông báo:** hiện cảnh báo tồn kho thấp, hết hàng và thay đổi của đơn đặt hàng, theo thời gian thực. Số đỏ là thông báo chưa đọc.

## 3. Các màn hình

**Tổng quan.** Bốn thẻ số liệu: mã hàng đang quản lý, tổng số lượng tồn, mã hàng sắp hết, mã hàng hết kho; kèm biểu đồ. Số liệu tự cập nhật khi tồn kho đổi.

**Tồn kho (Kiểm kê & Tồn kho).** Danh sách tồn theo sản phẩm và kho. Lọc theo kho, sản phẩm và trạng thái; bấm vào thẻ tổng hợp để lọc nhanh theo trạng thái. Bấm một dòng để xem chi tiết.

**Nhập kho, Xuất kho.** Chọn sản phẩm, kho, số lượng và lý do rồi xác nhận. Hệ thống không cho xuất nhiều hơn tồn hiện có.

**Chuyển kho.** Chọn kho nguồn, kho đích, sản phẩm và số lượng. Tồn kho hai bên đổi cùng lúc.

**Lịch sử giao dịch.** Mọi lần nhập, xuất, chuyển, điều chỉnh, kèm số dư trước và sau.

**Cảnh báo tồn kho.** Sản phẩm đang dưới mức tối thiểu hoặc đã hết.

**Dự báo nhu cầu.** Chọn sản phẩm, kho (tùy chọn) và số ngày (7, 14, 30). Biểu đồ cho thấy nhu cầu dự kiến mỗi ngày và khoảng tin cậy.
- Nhãn xanh "Dựa trên lịch sử bán thật": dự báo dùng doanh số xuất kho thật của sản phẩm.
- Nhãn vàng "Chưa đủ lịch sử bán · dữ liệu mẫu": sản phẩm có dưới 14 ngày lịch sử, kết quả chỉ để tham khảo.

**Đề xuất đặt hàng.** Bấm **Tính đề xuất bằng AI**. Mỗi dòng cho biết số lượng nên đặt, mức khẩn và lý do. Bấm **Chi tiết** để xem thời gian giao dự kiến, tồn an toàn, điểm đặt hàng lại. Bấm **Tạo đơn** (có thể sửa số lượng) để sinh một đơn nháp.

**Đơn đặt hàng.** Vòng đời: Nháp, Đã gửi, Nhận một phần, Đã nhận đủ (hoặc Đã hủy).
- Đơn nháp: sửa, xóa, gửi.
- Đơn đã gửi: hủy được nếu chưa nhận hàng.
- **Nhận hàng:** nhập số lượng nhận từng dòng. Không nhận vượt số đã đặt. Tồn kho tăng đúng số đã nhận.

**Kho, Sản phẩm, Nhóm hàng, Nhà cung cấp.** Thêm, sửa, xóa danh mục (ADMIN, MANAGER). Có thể tìm kiếm và lọc.

**Người dùng và vai trò (chỉ ADMIN).** Danh sách mọi tài khoản với email, số điện thoại, vai trò và trạng thái; có ô tìm kiếm và bộ lọc theo vai trò, trạng thái.
- Đổi vai trò bằng ô chọn ở cột Vai trò. Vai trò mới có hiệu lực khi người đó đăng nhập lại.
- Bấm **Khóa** để chặn một tài khoản đăng nhập; **Mở khóa** để cho dùng lại.
- Bạn không thể tự đổi vai trò hay tự khóa mình, và hệ thống luôn giữ lại ít nhất một quản trị viên đang hoạt động.

**Báo cáo và phân tích.** Hai báo cáo: tồn kho và giao dịch (lọc theo thời gian, loại, sản phẩm, kho).

## 4. Xử lý sự cố thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Không đăng nhập được, báo lỗi kết nối | Kiểm tra backend đang chạy ở cổng 8080 |
| Dự báo hoặc đề xuất báo lỗi dịch vụ AI | Kiểm tra AI service đang chạy ở cổng 8000 |
| Thông báo thời gian thực không hiện | Tải lại trang; hệ thống tự kết nối lại sau khi mất mạng |
| Không thấy nút thêm hoặc sửa, hoặc thiếu mục Nhập kho, Xuất kho | Tài khoản của bạn là STAFF hoặc VIEWER; nhờ ADMIN nâng vai trò ở trang Người dùng và vai trò, rồi đăng nhập lại |
| Báo tài khoản bị vô hiệu hóa | Quản trị viên đã khóa tài khoản; nhờ họ mở khóa |
| Đăng nhập sai nhiều lần rồi bị chặn tạm | Chờ khoảng 15 phút rồi thử lại |
