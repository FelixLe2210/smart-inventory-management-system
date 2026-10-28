# 🤖 Smart Inventory AI Service & Demand Forecasting Testing Guide

Tài liệu hướng dẫn kiểm thử và tích hợp phân hệ **AI Microservice (FastAPI)** trong hệ thống Smart Inventory Management System.

---

## 1. Tổng Quan Kiến Trúc (Sprint 7 - Milestone M4)

Phân hệ AI Service được xây dựng theo mô hình Microservice độc lập bằng **FastAPI** và **scikit-learn**, đảm nhiệm:
1. **Demand Forecasting (Dự báo nhu cầu hàng hóa)**: Sử dụng mô hình Machine Learning (Random Forest / Gradient Boosting) kết hợp kỹ thuật trích xuất đặc trưng chuỗi thời gian (Lag Features, Rolling Window Statistics, Calendar Features).
2. **Training & Inference Pipeline**: Tự động sinh/nạp dữ liệu chuỗi thời gian, huấn luyện mô hình, đánh giá chỉ số sai số (MAE, RMSE, R², MAPE), lưu trữ và nạp model artifacts (`.joblib`) tại thư mục `models/`.
3. **Chuẩn hóa REST API Envelope**: Đáp ứng 100% quy chuẩn cấu trúc phản hồi `ApiResponse` / `ApiError` theo [`docs/api/API_CONVENTIONS.md`](API_CONVENTIONS.md).

---

## 2. Hướng Dẫn Cài Đặt & Khởi Động

### Yêu cầu môi trường
- Python 3.11+ (hoặc công cụ quản lý gói `uv`)

### Các bước cài đặt:
```bash
cd ai-service

# 1. Khởi tạo môi trường ảo (khuyến nghị dùng uv hoặc python venv)
uv venv .venv --python 3.11
# Trên Windows:
.venv\Scripts\activate

# 2. Cài đặt các gói phụ thuộc
uv pip install -r requirements.txt
# Hoặc: pip install -r requirements.txt
```

### Khởi động AI Service:
```bash
# Cách 1: Chạy trực tiếp qua main.py
python main.py

# Cách 2: Chạy qua Uvicorn CLI
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- **Địa chỉ dịch vụ:** `http://localhost:8000`
- **Swagger UI Interactive Docs:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

---

## 3. Danh Sách Endpoint & Hướng Dẫn Kiểm Thử

### 3.1. Health Check (`GET /health` hoặc `GET /api/health`)
Xác nhận trạng thái hoạt động của service và model đang nạp.

**Request:**
```bash
curl -X GET http://localhost:8000/api/health
```

**Response mẫu (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "UP",
    "service": "Smart Inventory AI Service",
    "environment": "development",
    "uptime_seconds": 120,
    "model_loaded": true,
    "active_model": "demand_forecast_model.joblib",
    "algorithm": "random_forest"
  },
  "error": null,
  "timestamp": "2026-10-21T10:55:00Z"
}
```

---

### 3.2. Dự Báo Nhu Cầu (`POST /api/forecast/demand`)
Gửi yêu cầu dự báo nhu cầu tương lai cho một sản phẩm cụ thể.

**Request Body:**
```json
{
  "product_id": 1,
  "warehouse_id": 1,
  "horizon_days": 7,
  "include_confidence_intervals": true
}
```

**cURL command:**
```bash
curl -X POST http://localhost:8000/api/forecast/demand \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "warehouse_id": 1,
    "horizon_days": 7,
    "include_confidence_intervals": true
  }'
```

**Response mẫu (200 OK):**
```json
{
  "success": true,
  "data": {
    "product_id": 1,
    "warehouse_id": 1,
    "forecast_start_date": "2026-10-22",
    "forecast_end_date": "2026-10-28",
    "horizon_days": 7,
    "predictions": [
      {
        "date": "2026-10-22",
        "day_of_week": "Thursday",
        "predicted_demand": 14.8,
        "lower_bound": 9.9,
        "upper_bound": 19.7
      },
      {
        "date": "2026-10-23",
        "day_of_week": "Friday",
        "predicted_demand": 18.2,
        "lower_bound": 13.1,
        "upper_bound": 23.3
      }
    ],
    "total_predicted_demand": 112.5,
    "daily_average": 16.1,
    "model_name": "demand_forecast_model.joblib",
    "model_version": "1.0.0",
    "fallback_applied": false
  },
  "error": null,
  "timestamp": "2026-10-21T10:55:01Z"
}
```

---

### 3.3. Dự Báo Nhu Cầu Qua GET (`GET /api/forecast/product/{product_id}`)
Truy vấn nhanh dự báo nhu cầu thông qua URL params.

**cURL command:**
```bash
curl -X GET "http://localhost:8000/api/forecast/product/2?warehouse_id=1&horizon_days=14"
```

---

### 3.4. Kích Hoạt Huấn Luyện Lại Model (`POST /api/forecast/train`)
Trigger pipeline huấn luyện model mới trên dữ liệu cập nhật và tự động đăng ký model vào hệ thống.

**Request Body:**
```json
{
  "model_type": "random_forest",
  "days_of_history": 180,
  "test_size": 0.2,
  "save_as_default": true
}
```

**Response mẫu (200 OK):**
```json
{
  "success": true,
  "data": {
    "model_name": "demand_forecast_model.joblib",
    "model_type": "random_forest",
    "version": "1.0.0",
    "trained_at": "2026-10-21T10:55:30Z",
    "samples_count": 5400,
    "features": [
      "product_id",
      "warehouse_id",
      "day_of_week",
      "day_of_month",
      "month",
      "is_weekend",
      "quarter",
      "lag_1",
      "lag_2",
      "lag_3",
      "lag_7",
      "lag_14",
      "rolling_mean_7",
      "rolling_std_7",
      "rolling_mean_14"
    ],
    "metrics": {
      "mae": 1.482,
      "rmse": 2.115,
      "r2": 0.942,
      "mape": 8.75
    },
    "saved_path": "d:\\smart-inventory-management-system\\models\\demand_forecast_model.joblib"
  },
  "error": null,
  "timestamp": "2026-10-21T10:55:31Z"
}
```

---

### 3.5. Kiểm Tra Thông Tin Model Hiện Tại (`GET /api/forecast/models`)
```bash
curl -X GET http://localhost:8000/api/forecast/models
```

---

### 3.6. Dự Báo Chuẩn 7 / 14 / 30 Ngày (`GET /api/forecast/product/{id}/horizon/{days}`) — Sprint8-05/06/07
Chỉ chấp nhận `days` là `7`, `14` hoặc `30`; giá trị khác trả `400 BAD_REQUEST`.

```bash
curl "http://localhost:8000/api/forecast/product/1/horizon/14?warehouse_id=1&start_date=2026-11-01"
curl http://localhost:8000/api/forecast/horizons     # {"horizons": [7, 14, 30]}
```

### 3.7. Lưu / Nạp Model — Sprint8-08
Mỗi lần train, artifact `.joblib` được ghi atomic kèm file metadata `.json` cùng tên trong `models/`.

```bash
# Liệt kê model đã lưu (đọc metadata, không nạp model)
curl http://localhost:8000/api/forecast/models/saved

# Nạp một model đã lưu làm model đang dùng
curl -X POST http://localhost:8000/api/forecast/models/load \
  -H "Content-Type: application/json" \
  -d '{"model_name": "demand_forecast_model.joblib"}'
```

| Tình huống | Kết quả |
|---|---|
| Model không tồn tại | `404`, model đang dùng giữ nguyên |
| Tên không hợp lệ (vd `../x.joblib`) hoặc file hỏng | `400`, model đang dùng giữ nguyên |
| Train với `save_as_default=false` | Lưu thành `demand_forecast_<loại>_<timestamp>.joblib`, không ghi đè |

> Chỉ nạp file do hệ thống tự ghi trong `models/` (`joblib` dựa trên pickle).

---

## 4. Kiểm Thử Tự Động (Automated Testing Suite)

Bộ kiểm thử được xây dựng bằng `pytest` và `httpx.TestClient`, bao gồm 28 bài kiểm thử đơn vị và tích hợp (15 của Sprint 7 + 13 của Sprint 8 M2: `test_forecast_horizons.py`, `test_model_store.py`):

### Lệnh chạy test:
```bash
cd ai-service
pytest -v
```

### Kết quả chạy kiểm thử thực tế:
```
tests/test_forecast_api.py::test_forecast_demand_post_success PASSED     [  6%]
tests/test_forecast_api.py::test_forecast_product_get_success PASSED     [ 13%]
tests/test_forecast_api.py::test_forecast_with_custom_historical_data PASSED [ 20%]
tests/test_forecast_api.py::test_forecast_validation_error_missing_product_id PASSED [ 26%]
tests/test_forecast_api.py::test_forecast_validation_error_invalid_horizon_days PASSED [ 33%]
tests/test_forecast_api.py::test_forecast_validation_error_invalid_date_format PASSED [ 40%]
tests/test_forecast_api.py::test_models_info_endpoint PASSED             [ 46%]
tests/test_health.py::test_root_endpoint PASSED                          [ 53%]
tests/test_health.py::test_health_endpoint PASSED                        [ 60%]
tests/test_health.py::test_api_health_endpoint PASSED                    [ 66%]
tests/test_training_pipeline.py::test_synthetic_data_generation PASSED   [ 73%]
tests/test_training_pipeline.py::test_feature_engineering PASSED         [ 80%]
tests/test_training_pipeline.py::test_training_pipeline_and_prediction PASSED [ 86%]
tests/test_training_pipeline.py::test_model_save_and_load PASSED         [ 93%]
tests/test_training_pipeline.py::test_training_endpoint_trigger PASSED   [100%]

======================== 15 passed, 1 warning in 3.24s ========================
```
- **Tỷ lệ vượt qua:** **15/15 tests (100% PASS)**
