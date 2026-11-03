# Sprint 9 · M2 — Lead Time, Incoming Stock, Shortage Risk (AI #2)

| Thẻ | Hạng mục | File | Test |
|---|---|---|---|
| Sprint9-05 | Lead Time Logic | `ai-service/app/services/lead_time_logic.py` | `tests/test_lead_time_logic.py` |
| Sprint9-06 | Incoming Stock Logic | `ai-service/app/services/incoming_stock_logic.py` | `tests/test_incoming_stock_logic.py` |
| Sprint9-07 | Shortage Risk Logic | `ai-service/app/services/shortage_risk_logic.py` | `tests/test_shortage_risk_logic.py` |
| Sprint9-08 | Reorder Service Testing | `ai-service/app/services/reorder_service.py` (ghép M1 + M2) | `tests/test_reorder_service.py` |

Tất cả là hàm thuần (không DB, không HTTP): backend lấy dữ liệu rồi truyền vào, nên kiểm thử và giải thích được từng con số.
Chạy test: `cd ai-service && python -m pytest tests -q` (191 test).

## 1. Luồng tổng thể

```
Forecast (AI #1) ──┐
Supplier / lịch sử ┼─► lead_time_logic ──────┐
Purchase Orders ───┼─► incoming_stock_logic ─┼─► reorder_logic (M1)  ► số lượng + mức khẩn
Tồn kho ───────────┴─► shortage_risk_logic ──┘   + ngày đặt hàng + rủi ro thiếu hàng
```

`recommend_reorder(ReorderInput) -> ReorderRecommendation` là điểm vào duy nhất. Kết quả có `reasons`, `warnings`, `assumptions` để UI giải thích "vì sao đề xuất con số này".

## 2. Lead Time (Sprint9-05)

Nguồn dữ liệu, ưu tiên từ trên xuống:

| Nguồn | Điều kiện | Kỳ vọng | Độ lệch chuẩn |
|---|---|---|---|
| `observed` | ≥ 3 lần giao hàng thật hợp lệ | trung bình | độ lệch mẫu |
| `supplier_default` | có `suppliers.lead_time_days` | `lead_time_days` | `lead_time × (1 − reliability_score) × 0.5` |
| `default` | không biết gì | 7 ngày + cảnh báo | 0 |

`worst_case = kỳ vọng + 2σ`. Lead time còn dùng để: tính nhu cầu trong lúc chờ hàng (`lead_time_demand`), đưa độ biến động vào safety stock, và tính ngày phải đặt (`suggest_order_timing`).

**Ngày đặt hàng:** nếu `inventory position ≤ reorder point` → đặt hôm nay; ngược lại chờ `floor((position − ROP) / nhu cầu ngày)` ngày. `days_late > 0` nghĩa là dù đặt hôm nay hàng vẫn về sau lúc dự kiến hết hàng.

> `0.5` là hệ số giả định (hằng số `variability_factor`), không phải số đo từ dữ liệu. Khi có đủ lịch sử PO thì dùng `observed`.

## 3. Incoming Stock (Sprint9-06)

| Trạng thái PO | Có tính vào hàng đang về? |
|---|---|
| `SENT`, `PARTIALLY_RECEIVED` | Có — `max(0, ordered − received)` |
| `DRAFT` | Không (chưa cam kết với NCC), nhưng báo riêng `excluded_draft_qty` |
| `RECEIVED`, `CANCELLED` | Không |

- Tính theo cặp **(product, destination warehouse)**; PO của kho khác bị bỏ qua.
- PO **quá hạn** hoặc **không có ngày giao** vẫn nằm trong `total_on_order` (để không đặt trùng) nhưng **không** được coi là "về kịp" khi tính rủi ro, và có cảnh báo.
- Đây là cơ chế chống đặt hàng trùng, và là cơ sở cho luồng Recommendation → PO → Receiving ở Sprint 10.

## 4. Shortage Risk (Sprint9-07)

Câu hỏi: *"Nếu hôm nay chưa đặt thêm, có hết hàng trước khi lô tiếp theo kịp về không?"* Cửa sổ rủi ro = lead time (đơn mới chỉ có tác dụng sau chừng đó ngày).

1. **Mô phỏng theo ngày:** `tồn_t = tồn_{t−1} + hàng về_t − nhu cầu dự báo_t` → `days_until_stockout`, `projected_min_stock`.
2. **Xác suất:** nhu cầu trong cửa sổ ~ Normal(μ, σ), `μ = Σ dự báo`, `σ = √(LT·σ_d² + d²·σ_LT²)`,
   `P(hết hàng) = 1 − Φ((S − μ)/σ)` với `S` = tồn + hàng về trong cửa sổ. `expected_shortage_units = σ·(φ(z) − z·(1 − Φ(z)))`.

| Mức | Điều kiện |
|---|---|
| **HIGH** | mô phỏng cho thấy hết hàng trong cửa sổ, hoặc P ≥ 50% |
| **MEDIUM** | P ≥ 10%, hoặc tồn dự kiến tụt xuống dưới safety stock |
| **LOW** | còn lại |

Safety stock 95% (M1) làm P của mặt hàng khỏe ≤ 5% ⇒ LOW, nên hai phần M1/M2 nhất quán.

## 5. Quyết định cuối (service)

- `action`: `REORDER` (đặt thêm) · `EXPEDITE_INCOMING` (đã đặt đủ nhưng hàng về trễ → giục NCC/tìm nguồn khác) · `NONE`.
- `urgency_level` ghi vào `reorder_recommendations`: lấy mức cao hơn giữa urgency M1 (`NONE→LOW`) và `shortage_risk`; chỉ M1 mới cho `CRITICAL` (hết hàng, hoặc tồn chỉ đủ ít hơn lead time).
- Tồn dùng để quyết định = `current_stock − reserved_stock` (hàng đã giữ chỗ không bán được).
- `min_stock_level` của sản phẩm là sàn cho phần đệm của mức tồn mục tiêu (nếu không, sản phẩm dưới mức tối thiểu có thể bị cờ "cần đặt" nhưng số lượng = 0).
- Độ bất định nhu cầu `σ_d` lấy từ khoảng tin cậy của AI #1: `σ = (upper − predicted)/z`. Nếu forecast không có khoảng tin cậy → σ = 0 và có cảnh báo.

## 6. Ví dụ tính tay (khớp test)

Forecast 14 ngày: 10/11/12 lặp lại, khoảng 6–14; NCC lead time 7 ngày, reliability 0,9; tồn 60; không có PO.

| Đại lượng | Công thức | Kết quả |
|---|---|---|
| Nhu cầu TB | 153/14 | 10,93 |
| σ nhu cầu | (14 − ~11)/1,96 | 1,57 |
| σ lead time | 7 × 0,1 × 0,5 | 0,35 |
| Safety stock | 1,645·√(7·1,57² + 10,93²·0,35²) | 10 |
| Reorder point | 10,93×7 + 10 | 87 |
| Mức mục tiêu | 10,93×(7+7) + 10 | 163 |
| **Số lượng đề xuất** | 163 − 60 | **103** |
| Hết hàng sau | nhu cầu cộng dồn > 60 | ngày 6 (< lead time 7) ⇒ HIGH / CRITICAL |

Cùng sản phẩm, tồn 40 nhưng có PO 200 đơn vị giao ngày 20/11 (muộn): vị thế tồn = 240 > ROP nên không cần đặt thêm, **nhưng** hàng về sau khi đã hết ⇒ `EXPEDITE_INCOMING`, `days_late = 3`. Đây là trường hợp mà chỉ nhìn "tồn + đang về" sẽ bỏ sót.

## 7. Trả lời trước hội đồng

- **Forecast khác recommendation?** Forecast là nhu cầu dự kiến (AI #1). Recommendation trừ đi tồn hiện có và hàng đang về, cộng lead time và safety stock để ra số lượng/ngày đặt.
- **Vì sao dự báo 240 không đặt 240?** Vì đã có tồn và hàng đang về; ngược lại cần thêm đệm cho lead time và biến động.
- **Safety stock tính ra sao?** `Z × √(LT·σ_d² + d²·σ_LT²)`, Z theo service level (95% → 1,645).
- **Hạn chế thật:** hệ số biến động lead time (0,5) là giả định; σ nhu cầu phụ thuộc chất lượng khoảng tin cậy của AI #1; chưa có API/UI (thuộc M3, M4), chưa có chi phí tồn kho/thiếu hàng để tối ưu service level.
