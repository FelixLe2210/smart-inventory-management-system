# Bảo mật hệ thống

## Phân quyền theo vai trò (backend)

Token JWT chứa vai trò; quy tắc nằm trong `SecurityConfig`.

| Nhóm API | ADMIN | MANAGER | STAFF | VIEWER |
|---|:-:|:-:|:-:|:-:|
| Đọc dữ liệu (`GET /api/**`) | ✔ | ✔ | ✔ | ✔ |
| Xem dự báo `POST /api/forecast/demand` | ✔ | ✔ | ✔ | ✔ |
| Nhận hàng `POST /api/purchase-orders/{id}/receive` | ✔ | ✔ | ✔ | ✖ |
| Nhập, xuất, điều chỉnh, chuyển kho | ✔ | ✔ | ✔ | ✖ |
| Tạo, sửa, gửi, hủy, xóa đơn đặt hàng | ✔ | ✔ | ✖ | ✖ |
| Tạo, chấp nhận, từ chối đề xuất đặt hàng (`/api/reorder/**`) | ✔ | ✔ | ✖ | ✖ |
| Thêm, sửa, xóa sản phẩm, danh mục, nhà cung cấp, kho | ✔ | ✔ | ✖ | ✖ |

Chưa đăng nhập: 401 `UNAUTHORIZED`. Sai vai trò: 403 `FORBIDDEN`. Test: `RoleAuthorizationTest`.

Tài khoản tự đăng ký (tên đăng nhập, số điện thoại, Google, Facebook) mặc định có vai trò **VIEWER**, chỉ xem được. Quản trị viên nâng quyền lên STAFF hoặc MANAGER, ví dụ:

```sql
UPDATE user_roles SET role_id = (SELECT id FROM roles WHERE name = 'STAFF')
WHERE user_id = (SELECT id FROM users WHERE username = 'ten.dang.nhap');
```

 Biến `AUTH_DEFAULT_ROLE` đổi vai trò mặc định; giá trị `ADMIN` bị từ chối khi khởi động.

Giao diện ẩn các nút mà vai trò hiện tại không được dùng; backend vẫn kiểm tra quyền ở mọi API nên ẩn nút không phải là lớp bảo vệ duy nhất.

## Khóa đăng nhập

Sau 5 lần đăng nhập sai liên tiếp trong 15 phút, tài khoản (hoặc tên đăng nhập) bị khóa tạm thời. Backend trả HTTP 429 `TOO_MANY_ATTEMPTS` kèm header `Retry-After` (giây). Đăng nhập đúng sẽ xóa bộ đếm. Bộ đếm nằm trong bộ nhớ của một tiến trình backend, nên khởi động lại sẽ xóa và khi chạy nhiều bản backend thì mỗi bản đếm riêng; muốn dùng chung cần chuyển sang Redis hoặc bảng cơ sở dữ liệu.

## AI service

- CORS không còn `*`; danh sách origin nằm trong `ALLOWED_ORIGINS`.
- `POST /api/forecast/train` và `POST /api/forecast/models/load` cần header `X-Admin-Key` khi đặt `ADMIN_API_KEY`.
  Không đặt khóa: cho phép ở `APP_ENV=development`, từ chối ở môi trường khác.
- Nên chỉ mở cổng AI service trong mạng nội bộ (docker network); chỉ backend gọi tới.

## Triển khai production

Đặt `SPRING_PROFILES_ACTIVE=prod` và các biến bắt buộc: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`,
`JWT_SECRET` (>= 32 ký tự ngẫu nhiên), `CORS_ALLOWED_ORIGINS`. Profile `prod` không tạo tài khoản mẫu
và không có giá trị mặc định cho bí mật. Với AI service đặt `APP_ENV=production` và `ADMIN_API_KEY`.
