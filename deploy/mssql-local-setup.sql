/* =============================================================================
   TẠO DATABASE VÀ TÀI KHOẢN ỨNG DỤNG CHO SQL SERVER CÀI TRỰC TIẾP TRÊN WINDOWS (dùng SSMS)

   Chạy MỘT LẦN bằng tài khoản quản trị (Windows Authentication hoặc sa), kết nối vào instance
   (database đang chọn không quan trọng). An toàn khi chạy lại.

   Tạo: database smart_inventory, login smart_user (mật khẩu dev mặc định của dự án), và cấp quyền
   db_owner trên database đó để Flyway tạo bảng. Chỉ dùng cho máy phát triển; KHÔNG dùng mật khẩu này khi triển khai thật.
   ============================================================================= */
IF DB_ID(N'smart_inventory') IS NULL
    CREATE DATABASE smart_inventory;
GO
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'smart_user')
    CREATE LOGIN smart_user WITH PASSWORD = N'SmartPassword123!', CHECK_POLICY = OFF;
GO
USE smart_inventory;
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'smart_user')
    CREATE USER smart_user FOR LOGIN smart_user;
GO
ALTER ROLE db_owner ADD MEMBER smart_user;
GO
PRINT N'Xong: database smart_inventory va tai khoan smart_user da san sang.';
GO
