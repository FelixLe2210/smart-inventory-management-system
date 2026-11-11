# Hướng dẫn dữ liệu của hệ thống

Tài liệu này trả lời: dữ liệu nằm ở đâu, nạp thế nào, kiểm tra ra sao và dữ liệu hiện tại **đủ cho việc gì, chưa đủ cho việc gì**.

## 1. Bốn lớp dữ liệu

| Lớp | Nằm ở đâu | Dùng để | Trên Git? |
|---|---|---|---|
| Database nghiệp vụ | SQL Server, database `smart_inventory_capstone` trên máy phát triển (cổng 1433 nếu SQL Server cài trực tiếp; 1435 là mặc định của cấu hình nhóm và của Docker). Cấu trúc do Flyway `V1`–`V9` tạo | Chạy hệ thống | Chỉ có script, không có dữ liệu |
| Dữ liệu mẫu | `deploy/sample-data/seed_sample_data.sql` + `seed_sample_extra.sql` | Thử toàn bộ luồng nghiệp vụ | Có |
| Dataset huấn luyện AI | `data/raw/`, `data/processed/` ở gốc repo | Huấn luyện và đánh giá AI #1 | **Không** (bị `.gitignore`, sinh lại bằng lệnh) |
| File mô hình | `models/demand_forecast_model.joblib` + `.json` | Dự báo | Tùy `.gitignore`; AI service tự huấn luyện lại nếu thiếu hoặc sai phiên bản |

AI service **không có database riêng**. Khi tính đề xuất, backend đọc tồn kho, lịch sử xuất kho (giao dịch `ISSUING`), dòng PO đang về và thông tin nhà cung cấp từ SQL Server rồi gửi sang AI.

## 2. Nạp và kiểm tra dữ liệu mẫu trong database

Điều kiện: backend (profile `dev`) đã chạy ít nhất một lần để Flyway tạo bảng và tạo tài khoản `admin`.

Chạy lần lượt trong Azure Data Studio hoặc SSMS, đã chọn database `smart_inventory_capstone` (hoặc `smart_inventory` nếu máy bạn dùng tên đó):

1. `deploy/sample-data/seed_sample_data.sql`: 8 sản phẩm, 2 kho, 3 nhà cung cấp, 6 đơn, 90 ngày xuất kho.
2. `deploy/sample-data/seed_sample_extra.sql`: thêm 4 sản phẩm (hết hàng, sắp hết, dư hàng, có chuyển kho), đơn nhận một phần, đơn đã hủy, đơn nháp, điều chỉnh kiểm kê.
3. `deploy/sample-data/check_data_readiness.sql`: chỉ đọc, kiểm tra nhất quán.

Kết quả đúng sau bước 1 và 2: `products` có 12 dòng mang mã `SI-*`; ở phần 2 của bước 3 cột `so_dong_loi` đều bằng 0; ở phần 3 có 11 sản phẩm "Mô hình AI", 1 sản phẩm "Trung bình động" (`SI-FAN`, chỉ 10 ngày, cố ý để thử nhánh thiếu lịch sử) và cột `khong_du_du_lieu` bằng 0. Đây đúng là kết quả đã kiểm tra trên máy thật.

Muốn làm lại từ đầu: `deploy/sample-data/reset_sample_data.sql` rồi nạp lại. Reset chỉ xóa bản ghi mang mã `SI-*`.

Bốn sản phẩm bổ sung dùng cho các màn hình:

| Sản phẩm | Tình huống | Hiển thị ở |
|---|---|---|
| `SI-PRINTER` | Tồn 0 | Cảnh báo hết hàng, đề xuất khẩn cấp |
| `SI-SSD` | Tồn 8 < tối thiểu 15, có đơn nháp | Cảnh báo sắp hết, đơn nháp không tính là hàng đang về |
| `SI-WEBCAM` | Tồn 260 > tối đa 120, có giao dịch điều chỉnh | Trạng thái dư hàng, loại giao dịch Điều chỉnh |
| `SI-ROUTER` | Chuyển 30 cái sang kho 2, đơn nhận một phần 40/100 | Chuyển kho, PO nhận một phần |

### Lưu ý về tên database

Nếu máy bạn đã có sẵn database `smart_inventory` từ một chuỗi migration khác (Flyway báo `Migration description mismatch`), đừng sửa checksum. Hãy tạo database mới bằng `deploy/mssql-new-database.sql` và đặt `databaseName=smart_inventory_capstone` trong `backend\.env`.

## 3. Dataset huấn luyện AI

### 3.1. Sinh dataset mô phỏng (mặc định)

```powershell
cd ai-service
python run_data_prep.py
python -m data_prep.check_readiness
```

Tạo 24 chuỗi (8 SKU × 3 kho, mã `PRD-*` và `KHO-*`), từ 2024-01-01 đến 2026-09-30. File `data/raw/data_source.json` ghi `synthetic: true`.

> Mã `PRD-*` và `KHO-*` **không tồn tại** trong database. Dataset này dùng để huấn luyện và đánh giá, không dùng để tra ngược về sản phẩm của hệ thống.

### 3.2. Dùng dataset công khai hoặc dữ liệu thật

Ví dụ Kaggle "Store Item Demand Forecasting" (cột `date,store,item,sales`):

```powershell
cd ai-service
python run_data_prep.py --source csv --input D:\data\train.csv --map date=date,sku=item,warehouse_code=store,units_sold=sales
python -m data_prep.check_readiness
python -m data_prep.s08_model_evaluation
```

Cột bắt buộc: `date`, `sku`, `units_sold`. Các cột `warehouse_code`, `unit_price`, `promotion_flag` là tùy chọn. Sau đó AI service cần được huấn luyện lại bằng dữ liệu này.

### 3.3. Xuất lịch sử bán hàng của chính hệ thống

`deploy/sample-data/export_sales_for_ai.sql` gộp giao dịch xuất kho theo ngày × sản phẩm × kho thành đúng schema chuẩn. Lưu kết quả ra CSV rồi nạp bằng `--source csv`. Đường này đã được thử với dữ liệu giả lập có dạng giống kết quả xuất và chạy được.

Giới hạn quan trọng: pipeline đánh giá lấy **60 ngày cuối** làm tập kiểm tra, nên với lịch sử mẫu 60–90 ngày chỉ còn khoảng 30 ngày để huấn luyện. `check_readiness` sẽ báo "lịch sử huấn luyện quá ngắn". Đường này chứng minh dữ liệu của hệ thống đi vào AI được, nhưng **không đủ để đo độ chính xác**.

### 3.4. Kiểm tra mức sẵn sàng

`python -m data_prep.check_readiness` kiểm tra: đủ file, đủ cột, không có giá trị âm/trùng, chia train/test theo thời gian, độ dài lịch sử mỗi chuỗi, loại nhu cầu, phiên bản mô hình. Thêm `--known-skus skus.txt` (mỗi dòng một SKU lấy từ bảng `products`) để kiểm tra dataset có khớp sản phẩm trong database. Có lỗi thì lệnh thoát với mã 1.

## 4. Kết quả đánh giá hiện có (cần nói đúng khi bảo vệ)

Benchmark chính thức (`python -m data_prep.s08_model_evaluation`), chạy trên dữ liệu **mô phỏng**, 24 chuỗi, tập kiểm tra 2026-08-02 đến 2026-09-30:

| Mô hình | MAE |
|---|---:|
| Trung bình theo thứ trong tuần (baseline) | 2,3738 |
| Random Forest (đặc trưng lag/rolling) | 2,3951 |
| Gradient Boosting (đặc trưng lag/rolling) | 2,3969 |
| Random Forest (chỉ đặc trưng lịch) | 2,4537 |
| Seasonal naive 7 ngày | 3,2965 |

**Cập nhật 07/11/2026:** đã chạy cùng benchmark trên dataset Kaggle công khai (500 chuỗi); kết quả và giới hạn nằm ở `docs/ai/MODEL_EVALUATION_KAGGLE.md`. Trên dữ liệu đó, Random Forest thắng baseline tốt nhất khoảng 33%. Phần còn lại của mục này mô tả benchmark trên dữ liệu mô phỏng.

Cách đọc: trên dữ liệu mô phỏng này, baseline đơn giản **chưa bị mô hình học máy vượt qua**. Điều đó hợp lý vì dữ liệu được sinh chủ yếu từ quy luật theo thứ trong tuần, mùa vụ và nhiễu. Kết quả chỉ xác nhận pipeline đánh giá hoạt động, không nói gì về độ chính xác trên dữ liệu thật. Muốn có kết luận về mô hình, cần dataset thật hoặc công khai (mục 3.2).

## 5. Dữ liệu đã đủ chưa?

| Mục đích | Đủ chưa | Ghi chú |
|---|---|---|
| Thử luồng đề xuất → PO → nhận hàng | Đủ | Sau khi nạp cả hai file seed |
| Thử dashboard, cảnh báo, lịch sử giao dịch, chuyển kho, PO đủ trạng thái | Đủ | Cần seed bổ sung |
| Chạy thử pipeline AI | Đủ | Dataset mô phỏng |
| Chứng minh độ chính xác của AI #1 | **Chưa đủ** | Cần dataset thật hoặc công khai |
| Huấn luyện AI trên chính dữ liệu của hệ thống | **Chưa đủ** | Lịch sử mẫu quá ngắn |
| Dữ liệu cho Docker | Đủ khi nạp seed | Database Docker là database riêng, cần nạp seed lại |

## 6. Mô hình, sao lưu và Docker

- Mô hình phiên bản `2.0.0`. File cũ bị từ chối nên AI service tự huấn luyện lại; lần đầu có thể mất vài chục giây.
- Khi chạy Docker nên gắn volume cho thư mục `models/` để mô hình không mất sau mỗi lần dựng lại container.
- Sao lưu database trước khi thay đổi lớn:
  `BACKUP DATABASE smart_inventory_capstone TO DISK = 'D:\backup\smart_inventory_capstone.bak' WITH INIT;`
  (thư mục đích phải tồn tại và tài khoản chạy SQL Server có quyền ghi).
- Dataset trong `data/` không nằm trên Git: mỗi máy tự sinh lại bằng `python run_data_prep.py`.
