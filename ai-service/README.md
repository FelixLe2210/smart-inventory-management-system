# 🤖 Smart Inventory AI Service (FastAPI)

FastAPI-based microservice powering AI capabilities for the **Smart Inventory Management System**:
- **Demand Forecasting** (Random Forest / Gradient Boosting with time-series feature engineering)
- **Training Pipeline & Model Registry** (auto-load, validation, persistence, performance metrics)
- **RESTful API** compliant with project response envelopes (`docs/api/API_CONVENTIONS.md`)

## Features

- **Sprint 7 - M4**:
  - `Sprint7-13`: Create Python AI Service (FastAPI, CORS, Lifespan, Health checks, Config)
  - `Sprint7-14`: Create Training Pipeline (lag/rolling features, Random Forest, model persistence in `models/`)
  - `Sprint7-15`: Create Forecast Endpoint Skeleton & implementation (`/api/forecast/demand`, `/api/forecast/product/{id}`, `/api/forecast/train`)
  - `Sprint7-16`: AI Service Testing (Pytest unit & integration test suite)

## Quick Start

### 1. Setup virtual environment and dependencies

```bash
cd ai-service
# Using uv (recommended)
uv venv .venv --python 3.11
uv pip install -r requirements.txt

# Or standard pip
python -m venv .venv
source .venv/bin/activate  # on Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Run the Service

```bash
# Run via python main.py
python main.py

# Or via uvicorn directly
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation: `http://localhost:8000/docs`.

### 3. Run Tests

```bash
pytest
```

---

# AI Service – Chuẩn bị dữ liệu dự báo nhu cầu (Sprint 7 · M1)

| Thẻ | Hạng mục | File |
|---|---|---|
| Sprint7-01 | Collect & Prepare Sales Dataset | `data_prep/s01_collect_sales_dataset.py` |
| Sprint7-02 | Data Cleaning | `data_prep/s02_clean_data.py` |
| Sprint7-03 | EDA for Demand Data | `data_prep/s03_eda.py` → `docs/ai/EDA_REPORT.md` |
| Sprint7-04 | Prepare Training Dataset | `data_prep/s04_prepare_training_dataset.py` |
| Sprint7-05 | Calendar Feature Engineering | `data_prep/s05_calendar_features.py` |
| Sprint7-07 | Baseline Forecast Model | `data_prep/s07_baseline_forecast.py` |
| Sprint7-08 | AI Data Pipeline Testing | `tests/test_data_prep.py` |

## Chạy

```bash
cd ai-service
pip install -r requirements.txt
python run_data_prep.py                 # chạy Sprint7-01..07 với dữ liệu mô phỏng
python -m unittest discover -s tests -v # kiểm thử toàn bộ pipeline
```

Chạy từng bước: `python -m data_prep.s05_calendar_features` (cần chạy từ thư mục `ai-service`).

## Dùng dữ liệu thật

```bash
# Ví dụ Kaggle "Store Item Demand Forecasting" (date,store,item,sales)
python run_data_prep.py --source csv --input train.csv \
    --map date=date,sku=item,warehouse_code=store,units_sold=sales
```

Bắt buộc có `date`, `sku`, `units_sold`; `warehouse_code`, `unit_price`, `promotion_flag` là tùy chọn.
Khi có dữ liệu thật từ hệ thống (bảng `inventory_transactions`, loại `ISSUING`), gộp theo
ngày × sản phẩm × kho (`SUM(quantity)`) rồi xuất CSV với các cột trên.

## Sprint 8 · M1 – Đánh giá và so sánh mô hình dự báo

Sau khi có `data/processed/train.csv` và `test.csv`, chạy benchmark trên cùng test set:

```bash
cd ai-service
python -m data_prep.s08_model_evaluation
```

Kết quả được lưu tại `data/processed/model_comparison_metrics.json` và
`data/processed/model_comparison_predictions.csv`. Báo cáo gồm seasonal-naive,
weekday mean, Random Forest dùng feature lịch và feature lag/rolling, cùng
Gradient Boosting. XGBoost và Prophet chỉ được đánh giá nếu package tương ứng
đã cài; nếu không, báo cáo ghi rõ trạng thái thay vì làm hỏng benchmark.

Đây là đánh giá walk-forward một ngày: feature của mỗi ngày chỉ sử dụng lịch sử
đến ngày trước đó; số liệu thực tế của ngày test chỉ trở thành lịch sử cho dự
báo ngày kế tiếp. MAPE bỏ qua ngày có nhu cầu thực tế bằng 0; xem thêm MAE/WAPE
cho chuỗi intermittent. Dữ liệu hiện tại là mô phỏng, không đại diện cho độ
chính xác khi triển khai với dữ liệu bán hàng thật.

Kết quả hiện tại (2026-08-02 đến 2026-09-30, 24 chuỗi; MAPE tính trên 1.334
dòng có nhu cầu thực tế khác 0):

| Model | MAE | MAPE (%) | WAPE |
|---|---:|---:|---:|
| Weekday mean | 2.3738 | 39.2285 | 0.250712 |
| Random Forest · calendar | 2.4537 | 43.6243 | 0.259157 |
| Random Forest · calendar + lags/rolling | 2.3951 | 42.5276 | 0.252967 |
| Gradient Boosting · calendar + lags/rolling | 2.3969 | 42.3503 | 0.253156 |
| Seasonal naive · 7 ngày | 3.2965 | 56.9513 | 0.348174 |

Feature lag/rolling giảm MAE của Random Forest khoảng 2.4% so với feature lịch
đơn thuần, nhưng weekday mean vẫn là baseline tốt nhất trên holdout này. Chưa
chọn candidate ML làm mặc định dựa trên dữ liệu mô phỏng; XGBoost và Prophet
không được cài nên không có điểm số. Các số liệu đầy đủ và dự đoán nằm trong
hai file kết quả được tạo bởi lệnh benchmark ở trên.

## Đầu ra

```
data/raw/sales_raw.csv, data_source.json   # dữ liệu gốc + nguồn gốc (thật/mô phỏng)
data/processed/sales_clean.csv             # sau làm sạch
data/processed/cleaning_report.json        # số dòng bị ảnh hưởng ở mỗi bước
data/processed/train.csv, test.csv         # chia theo thời gian (test = 60 ngày cuối)
data/processed/data_schema.json            # mô tả cột, khoảng ngày, chuỗi lịch sử ngắn
data/processed/train_features.csv, test_features.csv # feature lịch; không fit trên test
data/processed/calendar_features.json      # mô tả các feature lịch
data/processed/baseline_predictions.csv, baseline_metrics.json # baseline 7 ngày và weekday mean
docs/ai/EDA_REPORT.md, docs/ai/eda/*.png
```

## Quyết định thiết kế cần nhóm biết

1. **Dữ liệu hiện tại là MÔ PHỎNG.** Hệ thống chưa có đủ lịch sử bán hàng thật (chỉ vài giao dịch E2E).
   Mô phỏng chỉ để dựng và kiểm thử pipeline; mọi kết luận EDA phải chạy lại trên dữ liệu thật.
   `data_source.json` và đầu báo cáo EDA luôn ghi rõ điều này.
2. **Chia theo thời gian, không ngẫu nhiên**, để tránh rò rỉ tương lai (Sprint 8 đánh giá MAE/MAPE).
3. **Outlier bị chặn (cap), không xóa**; ngày thiếu được điền và gắn `is_imputed=1`. Ngày thiếu có thể là
   hết hàng thật (nhu cầu bị che khuất), nên đừng coi `units_sold` = nhu cầu thật ở các dòng đó.
4. **Chuỗi intermittent** (nhiều ngày bán 0): đánh giá bằng MAE/WAPE thay vì MAPE.
5. `sku`, `warehouse_code` khớp `products.sku`, `warehouses.code` của backend để map ngược không cần bảng trung gian.
6. Feature ngày/tuần/tháng được tạo bằng cùng một phép biến đổi cho train và test; không fit trên test.
7. Sprint7-07 tạo hai baseline không cần thư viện ML: seasonal-naive 7 ngày và trung bình theo thứ trong tuần.
   Predictions chỉ dùng train; test chỉ dùng để tính MAE/WAPE. Kết quả trên dữ liệu mô phỏng chỉ xác nhận pipeline,
   không phải bằng chứng độ chính xác thực tế.
