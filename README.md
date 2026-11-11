# Smart Inventory Management System for Demand Forecasting and Reorder Recommendation

Hệ thống quản lý kho thông minh: theo dõi tồn kho theo thời gian thực, dự báo nhu cầu bán hàng và đề xuất số lượng đặt hàng bằng học máy.

## Chức năng chính

- **Quản lý kho:** sản phẩm, nhóm hàng, nhà cung cấp, kho; nhập, xuất, điều chỉnh, chuyển kho; lịch sử giao dịch với số dư trước và sau.
- **Cảnh báo và thông báo thời gian thực** (WebSocket): tồn thấp, hết hàng, thay đổi đơn đặt hàng.
- **AI #1, dự báo nhu cầu:** dự báo 7, 14 hoặc 30 ngày cho từng sản phẩm, kèm khoảng tin cậy; dùng lịch sử xuất kho thật của hệ thống.
- **AI #2, đề xuất đặt hàng:** tính thời gian giao, tồn an toàn, điểm đặt hàng lại, rủi ro thiếu hàng và số lượng nên đặt; chấp nhận đề xuất sẽ sinh đơn đặt hàng nháp.
- **Đơn đặt hàng:** Nháp, Đã gửi, Nhận một phần, Đã nhận đủ (hoặc Đã hủy); nhận hàng cập nhật tồn kho.
- **Tài khoản và phân quyền:** đăng nhập bằng tên đăng nhập, email, số điện thoại (OTP), Google, Facebook; bốn vai trò ADMIN, MANAGER, STAFF, VIEWER (ADMIN đổi vai trò và khóa tài khoản ngay trên giao diện); khóa tạm thời khi nhập sai mật khẩu nhiều lần.

## Công nghệ

| Lớp | Công nghệ |
|---|---|
| Giao diện | React 18, Vite, Tailwind CSS |
| Backend | Java 17, Spring Boot 3.5, Spring Security (JWT), Flyway, WebSocket |
| Cơ sở dữ liệu | Microsoft SQL Server 2022 |
| Dịch vụ AI | Python, FastAPI, scikit-learn (Random Forest cho dự báo) |
| Triển khai | Docker Compose |

Kết quả đánh giá mô hình trên dữ liệu công khai: `docs/ai/MODEL_EVALUATION_KAGGLE.md`.

## Chạy bằng Docker (khuyến nghị)

Yêu cầu Docker Desktop.

```bash
cp docker.env.example .env      # đổi mật khẩu và JWT_SECRET trước khi đưa lên máy chủ thật
docker compose up -d --build
```

Mở `http://localhost:8081`. Ở chế độ phát triển (`SPRING_PROFILES_ACTIVE=dev`, mặc định của compose) hệ thống tự tạo ba tài khoản: `admin / Admin@123`, `tester / Tester@123` (MANAGER), `staff / Staff@123`.

Nạp dữ liệu mẫu (chạy sau khi backend đã khởi động ít nhất một lần):

```bash
docker compose --profile tools run --rm --no-deps db-seed
```

Triển khai thật: đặt `SPRING_PROFILES_ACTIVE=prod` và các biến trong `docs/SECURITY.md`; profile này không tạo tài khoản mẫu.

## Chạy từng thành phần để phát triển

### Cơ sở dữ liệu

SQL Server chạy ở `localhost:1435` (có thể dùng `docker compose up -d mssql db-init`). Flyway tạo bảng khi backend khởi động.

### Backend

Yêu cầu JDK 17.

```bash
cd backend
./mvnw spring-boot:run          # Windows: .\mvnw.cmd spring-boot:run
```

Chạy ở `http://localhost:8080`, profile `dev`. Biến môi trường: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `AI_SERVICE_BASE_URL`.

### Dịch vụ AI

Yêu cầu Python 3.11 trở lên.

```bash
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

### Giao diện

Yêu cầu Node.js 18 trở lên.

```bash
cd frontend
npm install
npm run dev
```

Chạy ở `http://localhost:5173`.

## Kiểm thử

```bash
cd backend    && ./mvnw test        # Windows: .\mvnw.cmd test
cd ai-service && python -m pytest
cd frontend   && npm test && npm run build
```

## Dữ liệu và mô hình

- Dữ liệu mẫu để chạy thử: `deploy/sample-data/`.
- Chuẩn bị dữ liệu, huấn luyện và đánh giá mô hình: `docs/DATA_GUIDE.md`.
- Đo sai số theo độ dài dự báo (1 đến 30 ngày): `python -m data_prep.s10_horizon_evaluation` trong `ai-service`.

## Tài liệu

- `docs/USER_MANUAL.md`: hướng dẫn sử dụng.
- `docs/OPERATIONS_GUIDE.md`: vận hành, API chính, triển khai, xử lý lỗi.
- `docs/PRESENTATION_GUIDE.md`: kịch bản trình bày và câu hỏi bảo vệ.
- `docs/SECURITY.md`: phân quyền, khóa đăng nhập, cấu hình production.
- `docs/AUTH_SETUP.md`: cấu hình đăng nhập (Google, Facebook, OTP).
- `docs/REALTIME.md`: kênh thời gian thực.
- `docs/DATA_GUIDE.md`: dữ liệu và mô hình.
- `docs/TEST_REPORT.md`: kết quả kiểm thử.
- `docs/api/API_CONVENTIONS.md`: quy ước API.
