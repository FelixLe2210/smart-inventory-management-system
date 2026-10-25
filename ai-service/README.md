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
