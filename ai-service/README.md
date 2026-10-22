# AI Service – Chuẩn bị dữ liệu dự báo nhu cầu (Sprint 7 · M1)

| Thẻ | Hạng mục | File |
|---|---|---|
| Sprint7-01 | Collect & Prepare Sales Dataset | `data_prep/s01_collect_sales_dataset.py` |
| Sprint7-02 | Data Cleaning | `data_prep/s02_clean_data.py` |
| Sprint7-03 | EDA for Demand Data | `data_prep/s03_eda.py` → `docs/ai/EDA_REPORT.md` |
| Sprint7-04 | Prepare Training Dataset | `data_prep/s04_prepare_training_dataset.py` |

## Chạy

```bash
cd ai-service
pip install -r requirements.txt
python run_data_prep.py                 # chạy cả 4 bước với dữ liệu mô phỏng
python -m unittest discover -s tests -v # 9 test
```

Chạy từng bước: `python -m data_prep.s02_clean_data` (cần chạy từ thư mục `ai-service`).

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
6. Feature (lịch, lag, Tết, khuyến mãi) chưa làm ở đây, thuộc Sprint7-05 trở đi; phải fit trên train rồi áp lên test.
