/* =============================================================================
   XUẤT LỊCH SỬ BÁN HÀNG THẬT CỦA HỆ THỐNG CHO AI #1

   Gộp các giao dịch xuất kho (ISSUING) theo ngày x sản phẩm x kho, đúng schema chuẩn của
   ai-service (date, sku, warehouse_code, units_sold, unit_price, promotion_flag).

   Cách dùng:
     1. Chạy truy vấn bên dưới trong Azure Data Studio / SSMS.
     2. Lưu kết quả ra CSV (Azure Data Studio: nút "Save as CSV", có dòng tiêu đề).
     3. Nạp vào pipeline AI:
          cd ai-service
          python run_data_prep.py --source csv --input <duong_dan_file.csv> ^
              --map date=date,sku=sku,warehouse_code=warehouse_code,units_sold=units_sold,unit_price=unit_price,promotion_flag=promotion_flag

   LƯU Ý: pipeline đánh giá dùng 60 ngày cuối làm tập kiểm tra. Cần ít nhất vài trăm ngày lịch sử
   để có tập huấn luyện đủ lớn. Dữ liệu mẫu (60-90 ngày) CHỈ đủ để thử đường dẫn xuất/nạp; để đo độ chính
   xác hãy dùng dataset công khai hoặc dữ liệu bán hàng thật dài hạn. Kiểm tra bằng:
          python -m data_prep.check_readiness
   ============================================================================= */
SET NOCOUNT ON;

SELECT CONVERT(CHAR(10), CAST(t.created_at AS DATE), 23) AS [date],
       p.sku                                              AS sku,
       w.code                                             AS warehouse_code,
       SUM(t.quantity)                                    AS units_sold,
       CAST(p.selling_price AS DECIMAL(12,2))             AS unit_price,
       0                                                  AS promotion_flag
FROM inventory_transactions t
JOIN products   p ON p.id = t.product_id
JOIN warehouses w ON w.id = t.source_warehouse_id
WHERE t.transaction_type = 'ISSUING'
GROUP BY CAST(t.created_at AS DATE), p.sku, w.code, p.selling_price
ORDER BY [date], p.sku, w.code;
