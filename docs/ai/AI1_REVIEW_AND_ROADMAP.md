# AI #1 (Demand Forecasting) — Kết quả rà soát & hướng phát triển

Phạm vi rà soát: `ai-service/` (đọc toàn bộ + chạy test), tích hợp `backend/.../ForecastService.java` và `frontend/` (đọc code; frontend build + 74 test pass; **backend Java không build được trong môi trường rà soát** vì không tải được thư viện Maven, nên phần Java chỉ được đọc).

## A. Lỗi đã sửa

| # | Lỗi | Tác động | Cách sửa |
|---|---|---|---|
| 1 | **Chia train/test theo vị trí hàng.** Bảng được sắp theo (sản phẩm, kho, ngày) nên "20% cuối" là toàn bộ sản phẩm 9–10, không phải 20% ngày gần nhất. | Metric không đo khả năng dự báo tương lai; model chưa từng thấy sản phẩm test. Số báo cáo cũ MAPE **21,5%** sai lệch. | Chia theo mốc ngày chung cho mọi chuỗi (`pipeline.train`). Số đo lại sau tất cả các sửa lỗi: RF MAPE **9,6%**, WAPE 8,5%, MAE 3,21 (baseline tuần trước: 5,06). |
| 2 | **Rolling feature trộn giữa các chuỗi.** `groupby().shift()` rồi `.rolling()` trên cả cột ⇒ vài dòng đầu của chuỗi sau dùng dữ liệu cuối chuỗi trước. | Rò rỉ dữ liệu giữa sản phẩm/kho. | `groupby().transform(...)` trong `add_rolling_features`. |
| 3 | **Lệch `std` giữa train và dự báo** (pandas ddof=1 ↔ numpy ddof=0; mặc định 1.0 khi thiếu dữ liệu ↔ 0.0 lúc train). | Feature `rolling_std_7` khi dự báo khác lúc học. | Dùng ddof=1 và 0.0 ở `predict_multi_step`. |
| 4 | **Dự báo "giả" không báo cho người dùng.** Không có `historical_data` (backend hiện không gửi) ⇒ pipeline tự dựng lịch sử bịa từ `product_id`. | Số dự báo không phản ánh sản phẩm thật nhưng trông như thật. | Thêm `history_source` (`provided` / `synthetic_placeholder`) vào response (field thêm, Java đang `ignoreUnknown`). |
| 5 | Metric thiếu mốc so sánh. | Không biết model có hơn "bán giống tuần trước" không. | Thêm `wape`, `baseline_mae` (lag-7), `test_rows`. |
| 6 | **Mô hình không dự báo được ngoài khoảng dữ liệu nó học.** Cây quyết định học trên đơn vị thô (10–60 cái/ngày) nên sản phẩm bán 3 cái/ngày bị dự báo ~10, bán 200 cái/ngày bị dự báo ~83. Còn dùng `product_id` làm feature số. | Mọi dự báo và đề xuất đặt hàng cho sản phẩm có quy mô khác dữ liệu train đều sai. | Chuẩn hóa theo mức bán của chính chuỗi (lag/rolling chia cho trung bình 28 ngày, dự báo tỷ lệ nhu cầu/mức bán rồi nhân lại), bỏ `product_id`/`warehouse_id` khỏi feature, khoảng tin cậy tỷ lệ theo quy mô và không thấp hơn nhiễu Poisson. Mô hình phiên bản 2.0.0; file model cũ (1.x) bị từ chối và tự huấn luyện lại. Kết quả: mức 3 → 3,2; 20 → 19,4; 200 → 198,4 cái/ngày. |

Test hồi quy: `ai-service/tests/test_forecast_fixes.py`.

## B. Vấn đề còn lại (chưa sửa — cần quyết định của nhóm)

1. **Hai pipeline tách rời.** `data_prep/s01–s08` (SKU, `warehouse_code`, split theo thời gian, so sánh baseline/RF/GB, có Tết/khuyến mãi) tốt hơn pipeline chạy thật trong `app/ml` (dữ liệu synthetic sinh lúc khởi động, feature `product_id` số). Service **chưa dùng** dataset đã chuẩn bị ở các bước chuẩn bị dữ liệu. Ngược lại, `s05/s08` cũng **chưa đưa Tết và khuyến mãi vào feature** dù EDA cho thấy ảnh hưởng lớn (nghỉ Tết ×0,37; khuyến mãi +31%).
2. **`POST /api/forecast/demand` vẫn chưa gửi lịch sử bán.** `ForecastService.java` chỉ gửi `product_id`, `warehouse_id`, horizon nên trang Forecast vẫn dự báo từ lịch sử giả (xem lỗi 4). *Luồng Reorder mới đã tự gom xuất kho `ISSUING` theo ngày và gửi cho AI, và không bao giờ dùng lịch sử giả.* Còn lại: áp dụng cách gom tương tự cho trang Forecast.
3. **Toàn bộ dữ liệu là mô phỏng.** Chính EDA_REPORT đã cảnh báo; không được trình bày MAPE hiện tại như độ chính xác thực.
4. **`product_id` làm feature số** → cây quyết định chia theo ngưỡng ID vô nghĩa, không tổng quát cho sản phẩm mới.
5. **Khoảng tin cậy** = `±1.96·residual_std·√(1+0.08·bước)` — công thức giả định, chưa kiểm định độ phủ thực tế. Vì AI #2 lấy σ từ khoảng này nên sai ở đây lan sang safety stock.
6. **Đệ quy nhiều bước** (dự báo ngày t dùng dự báo ngày t−1) tích lũy sai số; chưa đo sai số theo horizon 7/14/30.
7. **Bảo mật/cấu hình:** `ALLOWED_ORIGINS` chứa `"*"` cùng `allow_credentials=True`; `/api/forecast/train` không xác thực (AI service chỉ nên gọi được từ backend).
8. **UI:** `ModelAccuracyCard` hiển thị "accuracy = 100 − MAPE" — cách nói dễ bị hội đồng bắt bẻ; nên hiển thị MAPE/WAPE và so với baseline.
9. Java `InventoryService` (M2): `adjustStock` kiểu `SET` ghi `quantity` = số tuyệt đối mới thay vì chênh lệch — lịch sử giao dịch khó đối chiếu; cân nhắc ghi delta.

## C. Hướng phát triển đề xuất (theo thứ tự đáng làm)

**Ưu tiên 1 — làm cho kết quả có giá trị khi bảo vệ (ngắn hạn)**
1. **Dùng dữ liệu công khai thật** để báo cáo chất lượng (Kaggle *Store Item Demand Forecasting* — `s01` đã có `--source csv`; hoặc M5/Favorita). Giữ synthetic chỉ cho test. Hệ thống vẫn dùng dữ liệu của kho, nhưng độ chính xác nêu trong báo cáo phải đến từ dữ liệu thật.
2. **Hợp nhất pipeline**: service train/serve từ cùng module với `s08` (SKU + warehouse_code, lag 28) và bổ sung feature Tết/ngày lễ/`promotion_flag` mà EDA đã chứng minh là quan trọng, bỏ `product_id` số.
3. **Backtest nhiều mốc cắt** (rolling-origin, ví dụ 4–6 mốc) và báo cáo MAE/WAPE **theo horizon 7/14/30**, luôn đặt cạnh baseline seasonal-naive. Một model chỉ "tốt" nếu thắng baseline ổn định.
4. **Nối backend → AI bằng lịch sử thật** (lỗi B2) và lưu kết quả vào bảng `demand_forecasts` (đã có `actual_quantity`).

**Ưu tiên 2 — làm AI #1 và AI #2 thành một hệ thống (ngắn hạn)**
5. **Dự báo phân vị (quantile)**: GradientBoosting `loss="quantile"` hoặc LightGBM cho P10/P50/P90 thay vì `±z·σ` giả định; kiểm tra độ phủ 80/95%. Đây là đầu vào trực tiếp cho `demand_std` và `safety stock` của AI #2.
6. **Vòng phản hồi:** ghi `actual_quantity` sau mỗi ngày, tính sai số thật, cảnh báo khi MAPE vượt ngưỡng → retrain. Là điểm mạnh của "AI vận hành" so với "AI notebook".
7. **Hàng bán chậm (intermittent)**: dùng Croston/TSB cho chuỗi ADI > 1,32 (EDA đã có 3 chuỗi) thay vì cùng một model.

**Ưu tiên 3 — nếu còn thời gian**
8. LightGBM/XGBoost global model có feature giá, khuyến mãi, ngày lễ; giải thích bằng feature importance/SHAP để trả lời "vì sao dự báo tăng".
9. AI #2 tối ưu theo chi phí (newsvendor: chi phí giữ hàng vs chi phí thiếu hàng) thay vì service level cố định; mô phỏng Monte Carlo thay xấp xỉ chuẩn khi nhu cầu lệch.
10. Một trang "Model card": dữ liệu, metric thật, giới hạn, ngày train — đúng tinh thần checklist bảo vệ ("không khẳng định accuracy nếu không có kết quả đo").

## D. Trung thực khi bảo vệ (theo checklist M3)

- Nói rõ model hiện chạy là RandomForest/GradientBoosting trên dữ liệu mô phỏng; metric là trên giai đoạn cuối của dữ liệu đó.
- Forecast dùng lịch sử thật chỉ khi backend gửi `historical_data` (`history_source = provided`).
- Hạn chế lớn nhất: chưa có dữ liệu bán hàng thật và chưa đo sai số theo horizon.
