-- Đăng ký / đăng nhập bằng số điện thoại và tài khoản mạng xã hội (Google, Facebook).
-- Số điện thoại lưu dạng E.164 (+84912345678). Cột có thể NULL nên dùng chỉ mục duy nhất có điều kiện:
-- ràng buộc UNIQUE thường của SQL Server chỉ cho phép đúng một dòng NULL.
-- Cột phone đã được V2 tạo; chỉ thêm khi chưa có để chạy được trên cả CSDL mới lẫn CSDL cũ.
IF COL_LENGTH('users', 'phone') IS NULL
    ALTER TABLE users ADD phone NVARCHAR(20) NULL;
GO

CREATE UNIQUE INDEX uk_users_phone ON users (phone) WHERE phone IS NOT NULL;
GO

-- Mỗi dòng liên kết một tài khoản với một danh tính ngoài (provider + mã người dùng của provider).
CREATE TABLE user_identities (
    id BIGINT NOT NULL IDENTITY(1,1),
    user_id BIGINT NOT NULL,
    provider NVARCHAR(20) NOT NULL,
    provider_user_id NVARCHAR(128) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT pk_user_identities PRIMARY KEY (id),
    CONSTRAINT uk_user_identities_provider UNIQUE (provider, provider_user_id),
    CONSTRAINT fk_user_identities_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
GO

CREATE INDEX ix_user_identities_user ON user_identities (user_id);
GO
