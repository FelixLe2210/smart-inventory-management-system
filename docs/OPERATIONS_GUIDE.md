# Hướng dẫn vận hành và triển khai

Luồng nghiệp vụ hoàn chỉnh: **Dữ liệu bán → Dự báo (AI #1) → Đề xuất đặt hàng (AI #2) → Đơn đặt hàng → Nhận hàng → Tồn kho tăng.**
Hướng dẫn từng bước cho người mới nằm trong tệp `Hướng dẫn sử dụng.docx`; kịch bản trình bày nằm ở `docs/PRESENTATION_GUIDE.md`.

## 1. Chạy bằng Docker Compose (khuyên dùng)

Cần: Docker Desktop (hoặc Docker Engine + Compose v2), khoảng 6 GB RAM trống (SQL Server).

```bash
cp docker.env.example .env        # tùy chọn: đổi mật khẩu/cổng
docker compose up -d --build      # lần đầu 5–15 phút (tải image, build Maven)
docker compose ps                 # chờ mssql, ai-service "healthy", backend "running"
docker compose logs -f backend    # thấy "Started SmartInventoryApplication" là xong
```

- Web: **http://localhost:8081**. Tài khoản `admin`, `tester`, `staff` do profile `dev` tạo; mật khẩu nằm trong README.
- Backend: http://localhost:8080 · SQL Server: `localhost:1435` (user `sa`, mật khẩu trong `.env`).
- AI service chỉ backend gọi được (không mở cổng ra ngoài). Muốn xem Swagger của AI (`/docs`), chạy AI cục bộ như mục 2.
- Máy Apple Silicon (M1/M2): image SQL Server chạy qua giả lập `linux/amd64`, khởi động chậm hơn.

**Nạp dữ liệu mẫu** (sau khi backend đã chạy, vì cần tài khoản `admin`):

```bash
docker compose --profile tools run --rm --no-deps db-seed
```

Lệnh này chạy `seed_sample_data.sql` rồi `seed_sample_extra.sql` (hết hàng, sắp hết, dư hàng, chuyển kho, đơn nhận một phần hoặc đã hủy). Kiểm tra bằng `deploy/sample-data/check_data_readiness.sql`. Xem `docs/DATA_GUIDE.md`.

Xóa dữ liệu mẫu: chạy `deploy/sample-data/reset_sample_data.sql` (bằng Azure Data Studio, SSMS hoặc `sqlcmd -I -f 65001 -d smart_inventory -i ...`; `-I` bắt buộc, `-f 65001` để giữ đúng tiếng Việt khi chạy trên Windows).

Khi backend chạy tay với SQL Server cài trực tiếp (`localhost:1433`, database `smart_inventory_capstone`, thông tin trong `backend/.env`), nạp dữ liệu vào đúng database đó bằng PowerShell:

```powershell
$pw = (Select-String -Path backend\.env -Pattern '^DB_PASSWORD=').Line.Split('=',2)[1]
foreach ($f in 'reset_sample_data','seed_sample_data','seed_sample_extra') {
  sqlcmd -S localhost,1433 -d smart_inventory_capstone -U smart_user -P $pw -C -I -f 65001 -b -i "deploy\sample-data\$f.sql"
}
```

Lệnh `db-reset`/`db-seed` của Docker chỉ tác động lên database trong container (cổng 1435).
Dừng: `docker compose down` (giữ dữ liệu) · `docker compose down -v` (xóa cả dữ liệu).

## 2. Chạy từng phần trên máy (không dùng Docker cho ứng dụng)

Cần JDK 17, Node 20, Python 3.11 và một SQL Server. Chỉ riêng SQL Server có thể dùng Docker:

```bash
docker compose up -d mssql db-init      # tạo DB smart_inventory + user smart_user (cổng 1435)
```

```bash
# 1) AI service  → http://localhost:8000/docs
cd ai-service
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000

# 2) Backend  → http://localhost:8080   (Flyway tự chạy V1…V9, DevDataSeeder tạo tài khoản)
cd backend
./mvnw spring-boot:run          # Windows: .\run-backend.ps1

# 3) Frontend  → http://localhost:5173
cd frontend
npm install
npm run dev
```

Nạp dữ liệu mẫu khi chạy kiểu này: mở `deploy/sample-data/seed_sample_data.sql` bằng Azure Data Studio hoặc SSMS, chọn database của dự án (`smart_inventory`), chạy; sau đó chạy tiếp `deploy/sample-data/seed_sample_extra.sql`.

## 3. API chính (đều cần header `Authorization: Bearer <token>`)

```bash
TOKEN=$(curl -s localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d '{"usernameOrEmail":"admin","password":"<mật khẩu trong README>"}' | python -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")
```

Chi tiết đăng nhập xem `docs/api/AUTH_API_TESTING.md`.

| Việc | Lệnh |
|---|---|
| Tính đề xuất (tất cả) | `curl -X POST localhost:8080/api/reorder/recommendations/generate -H "Authorization: Bearer $TOKEN"` |
| Tính cho 1 sản phẩm/kho | `... -H 'Content-Type: application/json' -d '{"productId":1,"warehouseId":1}'` |
| Danh sách / chi tiết | `GET /api/reorder/recommendations?status=PENDING` · `GET /api/reorder/recommendations/{id}` |
| Chấp nhận → tạo đơn nháp | `POST /api/reorder/recommendations/{id}/accept` body tùy chọn `{"quantity":150}` |
| Bỏ qua | `POST /api/reorder/recommendations/{id}/reject` |
| Đơn đặt hàng | `GET/POST /api/purchase-orders` · `GET/PUT/DELETE /api/purchase-orders/{id}` |
| Chuyển trạng thái | `POST /api/purchase-orders/{id}/send` · `/cancel` |
| Nhận hàng | `POST /api/purchase-orders/{id}/receive` body `{"lines":[{"itemId":5,"quantity":100}],"note":"..."}` |
| Danh sách tài khoản (chỉ ADMIN) | `GET /api/users` |
| Đổi vai trò (chỉ ADMIN) | `PATCH /api/users/{id}/role` body `{"role":"STAFF"}` |
| Khóa hoặc mở khóa (chỉ ADMIN) | `PATCH /api/users/{id}/status` body `{"active":false}` |
| AI service trực tiếp | `POST :8000/api/reorder/recommend` (xem `/docs`) |

Mã lỗi nghiệp vụ: `INVALID_PO_STATUS` (409), `OVER_RECEIVING` (400), `RECOMMENDATION_NOT_PENDING` (409), `NOTHING_TO_ORDER` (400), `PRODUCT_HAS_NO_SUPPLIER` (400), `CANNOT_MODIFY_SELF` (409), `LAST_ADMIN` (409), `AI_SERVICE_UNAVAILABLE`/`AI_SERVICE_TIMEOUT` (502/504).

## 4. Triển khai lên máy chủ (VPS)

Docker Compose chạy được nguyên xi trên một VPS Linux (≥ 2 vCPU, 4–8 GB RAM; SQL Server cần ≥ 2 GB RAM trống).

```bash
git clone <repo> && cd smart-inventory-management-system
cp docker.env.example .env && nano .env      # ĐỔI SA_PASSWORD, DB_PASSWORD, JWT_SECRET (≥ 32 ký tự ngẫu nhiên)
docker compose up -d --build
```

Trước khi mở ra Internet:
- [ ] Đổi mật khẩu 3 tài khoản mặc định (`admin`, `tester`, `staff`): `DevDataSeeder` chạy ở profile `dev` và dùng mật khẩu công khai trong tài liệu. Backend hiện **chỉ có profile `dev`** (cấu hình DB nằm trong `application-dev.yml`), nên chưa có profile production riêng; đây là việc nên làm tiếp.
- [ ] Đặt HTTPS phía trước (Caddy hoặc nginx + Let's Encrypt) trỏ vào cổng `WEB_PORT`; không mở cổng 1435/8080 ra ngoài (xóa các dòng `ports` của `mssql`, `backend` trong `docker-compose.yml`).
- [ ] `/api/forecast/train` của AI service không có xác thực: giữ nguyên việc **không** publish cổng 8000.
- [ ] Sao lưu volume `mssql-data` định kỳ.

Render và Railway không có SQL Server miễn phí; hãy dùng VPS (Oracle Always Free, Azure for Students…) hoặc đổi DB. Đổi DB cần sửa migration T-SQL nên không khuyến khích.

## 5. Hạn chế đã biết

1. Dữ liệu bán trong dữ liệu mẫu và dữ liệu huấn luyện của mô hình đang chạy là **mô phỏng**. Độ chính xác đo trên dữ liệu công khai của Kaggle được nêu trong `docs/ai/MODEL_EVALUATION_KAGGLE.md`; chỉ mới đo ở mức dự báo trước một ngày.
2. Hệ số biến động lead time (0,5 × (1 − độ tin cậy)) là giả định; khi có ≥ 3 đơn đã nhận thì dùng số đo thực tế.
3. Chưa có bước phê duyệt riêng cho đơn đặt hàng; "Gửi" ghi nhận người gửi vào `approved_by`.
4. Đề xuất tính một lần mỗi lần bấm nút (chưa có lịch tự chạy hằng đêm).
5. Đếm số lần đăng nhập sai (khóa tạm) nằm trong bộ nhớ một tiến trình backend, mất khi khởi động lại.
6. Vai trò nằm trong token đăng nhập, nên khi quản trị viên đổi vai trò, người đó phải đăng nhập lại mới thấy hiệu lực.

## 6. Xử lý lỗi thường gặp

| Triệu chứng | Kiểm tra |
|---|---|
| Backend không lên, lỗi kết nối DB | `docker compose ps` (mssql healthy?), `DB_URL` đúng host (`mssql` trong Docker, `localhost:1435` khi chạy tay), user `smart_user` đã được `db-init` tạo (`docker compose logs db-init`) |
| `Schema-validation: missing column [...]` | Migration chưa chạy: xem `docker compose logs backend | grep -i flyway` |
| `db-seed` báo "Chua co user admin" | Backend chưa khởi động xong lần đầu; đợi log "Seeded development user" rồi chạy lại |
| "Tính đề xuất" báo 502 `AI_SERVICE_UNAVAILABLE` | `docker compose logs ai-service`; lần đầu AI tự huấn luyện model ~10–30 giây |
| Mọi đề xuất kèm cảnh báo "thiếu lịch sử" | Sản phẩm < 14 ngày dữ liệu xuất kho; nạp dữ liệu mẫu hoặc xuất kho thật vài tuần |
| Trang trắng / 401 sau khi đổi `JWT_SECRET` | Đăng xuất, đăng nhập lại (token cũ không còn hợp lệ) |
| Cổng bị chiếm | Đổi `WEB_PORT`, `BACKEND_PORT`, `MSSQL_PORT` trong `.env` |
| Build backend trong Docker rất chậm | Lần đầu tải toàn bộ thư viện Maven; các lần sau dùng cache |
