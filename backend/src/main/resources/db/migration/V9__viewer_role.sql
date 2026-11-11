-- Vai trò chỉ xem. Tài khoản tự đăng ký (email, Google, Facebook, điện thoại) bắt đầu ở vai trò này;
-- quản trị viên nâng lên STAFF hoặc MANAGER khi cần.
INSERT INTO roles (name, description)
SELECT 'VIEWER', 'Read-only access'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'VIEWER');
