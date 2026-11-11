# Đăng nhập, đăng ký, Google, Facebook, số điện thoại

Trang đăng nhập có hai tab (Đăng nhập, Đăng ký) và ba cách vào nhanh: Google, Facebook, số điện thoại. Mọi cách đều kết thúc bằng cùng một phiên đăng nhập (JWT), nên phần còn lại của hệ thống không phụ thuộc cách người dùng đăng nhập.

## Cái gì chạy ngay, cái gì cần cấu hình

| Cách đăng nhập | Chạy ngay không cần cấu hình? | Cần gì thêm |
|---|---|---|
| Tên đăng nhập hoặc email + mật khẩu | Có | Không |
| Đăng ký bằng email + mật khẩu | Có | Không |
| Số điện thoại + mã 6 số | Có, ở chế độ dev (mã hiện ngay trên màn hình và trong log backend) | Muốn gửi SMS thật: nối một nhà cung cấp SMS (mục 4) |
| Google | Không | `GOOGLE_CLIENT_ID` (mục 2) |
| Facebook | Không | `FACEBOOK_APP_ID` và `FACEBOOK_APP_SECRET` (mục 3) |

Khi Google hoặc Facebook chưa cấu hình, bấm vào nút sẽ hiện hộp thông báo giải thích, không báo lỗi khó hiểu.

## 1. Nơi đặt cấu hình

Đặt vào tệp `backend\.env` (đã nằm trong `.gitignore`, không đưa lên GitHub). `run-backend.ps1` tự đọc tệp này:

```
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
FACEBOOK_APP_ID=1234567890
FACEBOOK_APP_SECRET=xxxxxxxxxxxxxxxx
```

Các biến khác (đều có giá trị mặc định):

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `AUTH_REGISTRATION_ENABLED` | `true` | `false` để tắt đăng ký tự do (chỉ admin tạo tài khoản) |
| `AUTH_DEFAULT_ROLE` | `VIEWER` | Vai trò của tài khoản mới. Không được là `ADMIN` (backend từ chối khởi động) |
| `AUTH_PHONE_ENABLED` | `true` | Tắt/bật đăng nhập bằng số điện thoại |
| `AUTH_PHONE_DEV_MODE` | `true` khi chạy profile dev, `false` còn lại | `true`: trả mã OTP về trình duyệt và ghi vào log để thử mà không cần SMS |

**Không bao giờ** đưa `FACEBOOK_APP_SECRET` vào mã nguồn hay ảnh chụp màn hình. Sau khi sửa `.env`, tắt và chạy lại backend.

## 2. Bật đăng nhập Google

1. Vào Google Cloud Console, tạo (hoặc chọn) một project.
2. Cấu hình màn hình đồng ý OAuth (OAuth consent screen): loại External, thêm email của bạn làm người dùng thử (Test users) khi app còn ở chế độ Testing.
3. Tạo thông tin xác thực kiểu OAuth client ID, loại Web application.
4. Ở mục Authorized JavaScript origins, thêm `http://localhost:5173`. Khi triển khai thật, thêm tên miền thật.
5. Sao chép Client ID vào `GOOGLE_CLIENT_ID`. Không cần Client secret.

Cách hoạt động: trình duyệt xin access token từ Google, gửi cho `POST /api/auth/google`. Backend hỏi Google xem token có hợp lệ không và có được cấp cho đúng Client ID của bạn không (chống dùng token của ứng dụng khác), rồi mới cho vào.

## 3. Bật đăng nhập Facebook

1. Vào Meta for Developers, tạo app (loại Consumer hoặc tương đương), thêm sản phẩm Facebook Login.
2. Trong Settings, Basic: lấy App ID và App Secret.
3. Trong Facebook Login, Settings: bật đăng nhập bằng JavaScript SDK và thêm `http://localhost:5173` vào danh sách domain/origin cho phép.
4. Khi app còn ở chế độ Development, chỉ tài khoản có vai trò trong app (admin, developer, tester) đăng nhập được. Thêm người thử ở mục App roles.
5. Điền `FACEBOOK_APP_ID` và `FACEBOOK_APP_SECRET`.

Cách hoạt động: trình duyệt lấy access token từ Facebook SDK, gửi cho `POST /api/auth/facebook`. Backend dùng App Secret để hỏi `debug_token` (token có hợp lệ và thuộc app này không) và `/me`. Giao diện các trang cấu hình của Google và Meta hay đổi tên mục, nếu không thấy đúng tên thì tìm theo ý nghĩa ở trên.

## 4. Số điện thoại và SMS thật

Luồng: nhập số, nhận mã 6 số (hết hạn sau 5 phút, xin lại sau 30 giây, nhập sai tối đa 5 lần), nhập mã. Số đã có tài khoản thì đăng nhập vào tài khoản đó; số mới thì tạo tài khoản mới. Vì vậy "đăng nhập" và "đăng ký" bằng số điện thoại dùng chung một luồng.

Hiện chưa gắn nhà cung cấp SMS, nên:
- Chế độ dev: mã hiện trong khung "Chế độ phát triển" trên trang đăng nhập và trong log backend.
- Chế độ thường (`AUTH_PHONE_DEV_MODE=false`): backend không in mã và không gửi đi đâu. Muốn gửi thật, viết một lớp thay `LoggingSmsSender` (interface `SmsSender`, một hàm `send(số, nội dung)`) gọi Twilio, eSMS, SpeedSMS hoặc nhà cung cấp bạn chọn.

Mã OTP lưu trong bộ nhớ của backend (một máy chủ). Chạy nhiều máy chủ thì cần chuyển sang Redis hoặc bảng trong cơ sở dữ liệu.

## 5. Quy tắc liên kết tài khoản

- Đăng nhập Google lần đầu: nếu đã có tài khoản cùng email và Google xác nhận email đó đã xác minh thì gắn vào tài khoản đó. Ngược lại tạo tài khoản mới.
- Facebook: Facebook chỉ trả email đã được xác nhận. Không có email thì tạo tài khoản với email giữ chỗ dạng `facebook_<id>@users.smartinventory.local`.
- Tài khoản tạo từ số điện thoại hoặc mạng xã hội không có mật khẩu dùng được (mật khẩu ngẫu nhiên, không ai biết). Người dùng chỉ vào bằng đúng cách đã đăng ký.
- Mọi tài khoản mới có vai trò `STAFF` (thao tác kho, nhận hàng). Quản trị viên nâng quyền thủ công trong cơ sở dữ liệu nếu cần. Nếu không muốn ai tự đăng ký, đặt `AUTH_REGISTRATION_ENABLED=false`.

## 6. API (không cần token)

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/auth/providers` | Cách đăng nhập đang bật và mã công khai (Google client id, Facebook app id) |
| POST | `/api/auth/login` | Đăng nhập bằng mật khẩu |
| POST | `/api/auth/register` | `{username, email, password}`. 201 và phiên đăng nhập; 409 `USERNAME_TAKEN` hoặc `EMAIL_TAKEN`; 400 `WEAK_PASSWORD` |
| POST | `/api/auth/google` | `{token}` access token Google |
| POST | `/api/auth/facebook` | `{token}` access token Facebook |
| POST | `/api/auth/phone/request-otp` | `{phone}`. Trả `devCode` chỉ khi chế độ dev |
| POST | `/api/auth/phone/verify` | `{phone, code}` |

Cơ sở dữ liệu: migration `V8__user_phone_and_identities.sql` thêm cột `users.phone` (duy nhất khi có giá trị) và bảng `user_identities` (liên kết tài khoản với Google/Facebook). Flyway tự chạy khi bật backend.

## 7. Kiểm thử thủ công (thêm vào báo cáo kiểm thử)

Chuẩn bị: backend và frontend đang chạy, mở `http://localhost:5173/login` (tab ẩn danh cho sạch).

| Mã | Việc làm | Kết quả đúng | Kết quả |
|---|---|---|---|
| T24 | Bấm nút mặt trời/mặt trăng một lần | Đổi sáng/tối ngay, màu loang từ nút, mở lại trang vẫn giữ lựa chọn | |
| T25 | Đăng nhập `admin / Admin@123` | Vào Tổng quan | |
| T26 | Đăng nhập sai mật khẩu | Hộp lỗi đỏ "Tên đăng nhập hoặc mật khẩu chưa đúng." rung nhẹ | |
| T27 | Tab Đăng ký: tên `abc.test`, email thật, mật khẩu `Abcd1234` | Thanh độ mạnh và 3 dấu tích hiện khi gõ; đăng ký xong vào thẳng Tổng quan với quyền nhân viên | |
| T28 | Đăng ký lại cùng tên đăng nhập | Báo "Tên đăng nhập này đã có người dùng" ngay dưới ô | |
| T29 | Mật khẩu `abcdefgh` (không có số) | Báo thiếu số, không gửi lên máy chủ | |
| T30 | Bấm Điện thoại, nhập `0912 345 678`, Gửi mã | Hiện 6 ô nhập mã và khung "Chế độ phát triển" kèm mã; bấm Điền mã vào Tổng quan | |
| T31 | Nhập sai mã 6 số | Báo "Mã chưa đúng hoặc đã hết hạn", ô nhập được xóa để nhập lại | |
| T32 | Bấm Gửi lại mã khi đồng hồ còn đếm | Nút bị khóa đến khi hết 30 giây | |
| T33 | Chưa cấu hình Google/Facebook, bấm nút | Hộp thông báo xanh giải thích cần cấu hình, không lỗi | |
| T34 | Đã cấu hình Google, bấm Google, chọn tài khoản | Vào Tổng quan; đăng xuất rồi vào lại bằng Google thì vào đúng tài khoản cũ | |
| T35 | Đã cấu hình Facebook, bấm Facebook | Như T34 | |
| T36 | Thu nhỏ cửa sổ dưới 1024px | Khung minh họa bên trái ẩn, form vẫn đủ dùng; ba nút Google/Facebook/Điện thoại không bị cắt chữ | |

T34 và T35 chỉ làm được sau khi bạn tạo Client ID và App ID thật. Nếu chưa có, ghi "Chưa thử, cần khóa của nhà cung cấp" trong báo cáo thay vì bỏ trống.
