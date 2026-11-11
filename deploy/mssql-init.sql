-- Tạo database + tài khoản ứng dụng cho SQL Server (chạy một lần bởi dịch vụ db-init).
-- Biến sqlcmd: $(APP_DB_PASSWORD)
IF DB_ID(N'smart_inventory') IS NULL
    CREATE DATABASE smart_inventory;
GO
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'smart_user')
    CREATE LOGIN smart_user WITH PASSWORD = N'$(APP_DB_PASSWORD)', CHECK_POLICY = OFF;
GO
USE smart_inventory;
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'smart_user')
    CREATE USER smart_user FOR LOGIN smart_user;
GO
ALTER ROLE db_owner ADD MEMBER smart_user;
GO
