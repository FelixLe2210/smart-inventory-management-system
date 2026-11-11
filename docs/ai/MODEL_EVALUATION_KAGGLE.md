# Đánh giá mô hình dự báo trên dataset công khai

Ngày chạy: 07/11/2026. Lệnh: `python run_data_prep.py --source csv ...` rồi `python -m data_prep.s08_model_evaluation` (xem `docs/DATA_GUIDE.md`, mục 3.2).

## Dataset và cách đo

- **Nguồn:** Kaggle, "Store Item Demand Forecasting Challenge" (`train.csv`): 10 cửa hàng × 50 sản phẩm = 500 chuỗi, 913.000 dòng, 01/01/2013 đến 31/12/2017, không thiếu ngày, không giá trị âm hay trùng.
- **Chia dữ liệu theo thời gian:** train đến 01/11/2017 (883.000 dòng); test từ 02/11/2017 đến 31/12/2017 (60 ngày × 500 chuỗi = 30.000 dòng).
- **Cách chấm:** dự báo trước **một ngày** (walk-forward). Các đặc trưng trễ (lag) và trung bình trượt chỉ dùng dữ liệu của những ngày trước đó; thực tế ngày hôm trước được biết khi dự báo ngày kế tiếp.
- **Chỉ số:** MAE (sai số tuyệt đối trung bình, đơn vị cái/ngày), WAPE (tổng sai số tuyệt đối chia tổng nhu cầu), MAPE.

## Kết quả

| Mô hình | MAE | RMSE | WAPE | MAPE |
|---|---:|---:|---:|---:|
| **Random Forest (đặc trưng lag và trung bình trượt)** | **6,31** | 8,34 | **11,9%** | 14,1% |
| Gradient Boosting (cùng đặc trưng) | 6,59 | 8,65 | 12,4% | 14,9% |
| Baseline: lặp lại 7 ngày trước | 9,37 | 12,57 | 17,6% | 21,1% |
| Baseline: trung bình theo thứ trong tuần | 9,72 | 12,36 | 18,3% | 20,4% |
| Random Forest (chỉ đặc trưng lịch) | 16,38 | 20,76 | 30,8% | 39,7% |

XGBoost và Prophet không được cài nên không có trong bảng.

## Cách đọc kết quả

1. **Mô hình học máy vượt baseline rõ rệt** trên dữ liệu công khai: MAE của Random Forest thấp hơn baseline tốt nhất (lặp lại 7 ngày) khoảng 33% (6,31 so với 9,37) và thấp hơn baseline theo thứ trong tuần khoảng 35%. Đây là điểm khác với kết quả trên dữ liệu mô phỏng cũ, nơi baseline nhỉnh hơn (xem `docs/DATA_GUIDE.md`, mục 4): dữ liệu mô phỏng được sinh chủ yếu từ quy luật theo tuần nên baseline vốn rất mạnh, còn dữ liệu Kaggle có xu hướng tăng theo năm mà baseline không bắt được.
2. **Đặc trưng lag quyết định chất lượng.** Cùng thuật toán, bản chỉ có đặc trưng lịch (không biết nhu cầu những ngày trước) kém hơn cả hai baseline (MAE 16,38). Vì vậy độ chính xác này phụ thuộc vào việc luôn có dữ liệu bán của những ngày gần nhất.

## Giới hạn cần nói thẳng khi bảo vệ

1. **Chấm trước một ngày, trong khi sản phẩm dự báo 7 đến 30 ngày.** Dự báo nhiều ngày phải dùng chính dự đoán của mình làm đặc trưng lag cho ngày sau nên sai số sẽ lớn hơn con số trên. Sai số theo độ dài dự báo được đo bằng `python -m data_prep.s10_horizon_evaluation` (dự báo đệ quy, không dùng dữ liệu tương lai) và ghi vào `docs/ai/HORIZON_EVALUATION.md`; xem file đó để biết WAPE ở 1, 7, 14, 30 ngày.
2. **Mô hình đang chạy trong dịch vụ AI chưa được huấn luyện trên dataset này.** Bảng trên đánh giá phương pháp (đặc trưng và thuật toán) trên dữ liệu công khai. Mô hình triển khai (`models/demand_forecast_model.joblib`, phiên bản 2.0.0) vẫn được huấn luyện từ bộ sinh dữ liệu mô phỏng của dự án. Khi có dữ liệu bán hàng thật của doanh nghiệp, cần huấn luyện lại bằng dữ liệu đó.
3. **Dataset công khai không phải dữ liệu kho của hệ thống này**, nên kết quả chứng minh phương pháp hoạt động trên dữ liệu bán hàng thật chứ không chứng minh độ chính xác trên sản phẩm của một doanh nghiệp cụ thể.
4. **Chưa có giá và khuyến mãi** trong dataset (cột giá để trống), nên chưa đo tác động của giá hay khuyến mãi.
5. Chỉ số WAPE 11,9% nghĩa là tổng sai số bằng khoảng 12% tổng nhu cầu ở mức một ngày; không nên hiểu là "độ chính xác 88%" cho dự báo dài hạn.
