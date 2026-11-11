# Mô phỏng chính sách đặt hàng: AI #2 và quy tắc min/max cố định

> Tệp này do `python -m data_prep.s09_policy_simulation` sinh ra. Chạy lại để cập nhật.

Mô phỏng 24 chuỗi (SKU x kho) trong 120 ngày cuối của dữ liệu, hạt giống ngẫu nhiên 7. Nhu cầu là `units_sold` trong `data/processed/sales_clean.csv`.

**Giới hạn.** Dữ liệu hiện tại là mô phỏng, nên kết quả chỉ so sánh *chính sách* trên cùng nhu cầu và cùng thời gian giao ngẫu nhiên, không chứng minh hiệu quả trên dữ liệu thật. Dự báo trong mô phỏng là trung bình trượt 28 ngày, không phải mô hình học máy, để tách chất lượng chính sách khỏi chất lượng dự báo. Phần thiếu hàng được coi là mất doanh số (không bù đơn).

Chỉ số: **mức phục vụ** = 1 − số lượng thiếu / tổng nhu cầu; **ngày hết hàng** = tỉ lệ ngày có thiếu hàng; **ngày tồn** = tồn kho trung bình / nhu cầu trung bình ngày.

## Nhà cung cấp ổn định (khai báo 7 ngày, thực tế 7 ± 1)

| Chính sách | Mức phục vụ | Ngày hết hàng | Tồn TB (cái) | Ngày tồn | Số đơn |
|---|---:|---:|---:|---:|---:|
| Min/max cố định, min = 3 ngày bán | 76.0% | 23.2% | 48 | 5.2 | 145 |
| Min/max cố định, min = 5 ngày bán | 84.2% | 16.4% | 53 | 5.8 | 162 |
| Min/max cố định, min = 7 ngày bán | 93.0% | 8.3% | 60 | 6.5 | 186 |
| Min/max cố định, min = 10 ngày bán | 98.6% | 2.3% | 80 | 8.7 | 197 |
| Min/max cố định, min = 14 ngày bán | 99.8% | 0.3% | 116 | 12.6 | 214 |
| **AI #2** | 97.5% | 2.8% | 49 | 5.4 | 361 |

**Kết luận kịch bản:** Để đạt mức phục vụ tương đương (97.5%), chính sách tĩnh rẻ nhất (static_min_10d) cần tồn kho trung bình nhiều hơn AI #2 khoảng 38%.

## Nhà cung cấp trễ và dao động (khai báo 7 ngày, thực tế 10 ± 3)

| Chính sách | Mức phục vụ | Ngày hết hàng | Tồn TB (cái) | Ngày tồn | Số đơn |
|---|---:|---:|---:|---:|---:|
| Min/max cố định, min = 3 ngày bán | 66.8% | 31.4% | 43 | 4.6 | 127 |
| Min/max cố định, min = 5 ngày bán | 72.8% | 27.2% | 46 | 5.0 | 136 |
| Min/max cố định, min = 7 ngày bán | 80.6% | 19.7% | 51 | 5.5 | 160 |
| Min/max cố định, min = 10 ngày bán | 90.5% | 10.8% | 65 | 7.1 | 182 |
| Min/max cố định, min = 14 ngày bán | 96.5% | 4.2% | 92 | 10.0 | 207 |
| **AI #2** | 92.6% | 7.1% | 64 | 6.9 | 360 |

**Kết luận kịch bản:** Để đạt mức phục vụ tương đương (92.6%), chính sách tĩnh rẻ nhất (static_min_14d) cần tồn kho trung bình nhiều hơn AI #2 khoảng 30%.

**Cái giá của AI #2:** AI #2 đặt nhiều đơn nhỏ hơn (số đơn gần gấp đôi quy tắc cố định) vì đánh giá lại mỗi ngày. Nếu mỗi đơn hàng có phí cố định cao (vận chuyển, nhân công), lợi thế về tồn kho sẽ giảm. Mô phỏng này không tính chi phí đặt hàng. Chính sách tĩnh được so sánh ở mức rẻ nhất có mức phục vụ *bằng hoặc cao hơn* AI #2, nên so sánh nghiêng về phía chính sách tĩnh.

Cách đọc: một chính sách tốt cho mức phục vụ cao với ít ngày tồn. Tăng mức min của quy tắc cố định làm tăng cả mức phục vụ lẫn tồn kho; câu hỏi là AI #2 có đạt mức phục vụ đó với tồn kho thấp hơn không.
