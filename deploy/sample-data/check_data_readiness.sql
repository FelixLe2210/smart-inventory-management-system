/* =============================================================================
   KIỂM TRA DỮ LIỆU TRONG DATABASE (chỉ đọc, không sửa gì)

   Chạy trên database smart_inventory. Gồm 3 phần:
     1. Số dòng của từng bảng chính.
     2. Các kiểm tra nhất quán: cột "so_dong_loi" phải bằng 0.
     3. Mức sẵn sàng cho AI: mỗi sản phẩm có bao nhiêu ngày lịch sử xuất kho.
   Đây cũng là câu trả lời cho câu hỏi bảo vệ "làm sao phát hiện dữ liệu tồn kho không hợp lệ?".
   ============================================================================= */
SET NOCOUNT ON;

-- ============================================================ 1. số dòng
SELECT bang, so_dong FROM (
    SELECT 1 AS thu_tu, 'users' AS bang, COUNT(*) AS so_dong FROM users
    UNION ALL SELECT 2, 'roles', COUNT(*) FROM roles
    UNION ALL SELECT 3, 'categories', COUNT(*) FROM categories
    UNION ALL SELECT 4, 'suppliers', COUNT(*) FROM suppliers
    UNION ALL SELECT 5, 'warehouses', COUNT(*) FROM warehouses
    UNION ALL SELECT 6, 'products', COUNT(*) FROM products
    UNION ALL SELECT 7, 'inventories', COUNT(*) FROM inventories
    UNION ALL SELECT 8, 'inventory_transactions', COUNT(*) FROM inventory_transactions
    UNION ALL SELECT 9, 'purchase_orders', COUNT(*) FROM purchase_orders
    UNION ALL SELECT 10, 'purchase_order_items', COUNT(*) FROM purchase_order_items
    UNION ALL SELECT 11, 'reorder_recommendations', COUNT(*) FROM reorder_recommendations
) t ORDER BY thu_tu;

-- ============================================================ 2. kiểm tra nhất quán
-- Mỗi giao dịch thuộc về MỘT kho: nhập/chuyển đến -> kho đích; xuất/điều chỉnh/chuyển đi -> kho nguồn.
;WITH txn AS (
    SELECT t.id, t.product_id, t.created_at, t.balance_before, t.balance_after,
           CASE WHEN t.transaction_type IN ('RECEIVING', 'TRANSFER_IN')
                THEN t.destination_warehouse_id ELSE t.source_warehouse_id END AS wh_id
    FROM inventory_transactions t
),
ordered AS (
    SELECT x.*,
           LAG(x.balance_after) OVER (PARTITION BY x.product_id, x.wh_id ORDER BY x.created_at, x.id) AS prev_after,
           ROW_NUMBER() OVER (PARTITION BY x.product_id, x.wh_id ORDER BY x.created_at DESC, x.id DESC) AS rn_last
    FROM txn x
)
SELECT kiem_tra, so_dong_loi, CASE WHEN so_dong_loi = 0 THEN N'OK' ELSE N'CẦN XEM' END AS ket_qua
FROM (
    SELECT 1 AS thu_tu, N'Tồn kho âm hoặc giữ chỗ vượt tồn' AS kiem_tra,
           (SELECT COUNT(*) FROM inventories WHERE current_stock < 0 OR reserved_stock > current_stock) AS so_dong_loi
    UNION ALL
    SELECT 2, N'Tồn hiện tại khác số dư của giao dịch cuối cùng',
           (SELECT COUNT(*) FROM inventories i
            JOIN ordered o ON o.product_id = i.product_id AND o.wh_id = i.warehouse_id AND o.rn_last = 1
            WHERE i.current_stock <> o.balance_after)
    UNION ALL
    SELECT 3, N'Chuỗi giao dịch bị đứt (số dư trước ≠ số dư sau của giao dịch liền trước)',
           (SELECT COUNT(*) FROM ordered WHERE prev_after IS NOT NULL AND balance_before <> prev_after)
    UNION ALL
    SELECT 4, N'Có tồn kho nhưng chưa từng có giao dịch (không truy vết được)',
           (SELECT COUNT(*) FROM inventories i
            WHERE i.current_stock > 0
              AND NOT EXISTS (SELECT 1 FROM ordered o WHERE o.product_id = i.product_id AND o.wh_id = i.warehouse_id))
    UNION ALL
    SELECT 5, N'Dòng đơn hàng nhận vượt số đặt',
           (SELECT COUNT(*) FROM purchase_order_items WHERE received_qty > ordered_qty)
    UNION ALL
    SELECT 6, N'Trạng thái đơn không khớp số lượng đã nhận',
           (SELECT COUNT(*) FROM purchase_orders po
            WHERE (po.status = 'RECEIVED'
                   AND EXISTS (SELECT 1 FROM purchase_order_items i WHERE i.purchase_order_id = po.id AND i.received_qty < i.ordered_qty))
               OR (po.status = 'PARTIALLY_RECEIVED'
                   AND NOT EXISTS (SELECT 1 FROM purchase_order_items i WHERE i.purchase_order_id = po.id AND i.received_qty > 0))
               OR (po.status IN ('DRAFT', 'SENT', 'CANCELLED')
                   AND EXISTS (SELECT 1 FROM purchase_order_items i WHERE i.purchase_order_id = po.id AND i.received_qty > 0)))
    UNION ALL
    SELECT 7, N'Tổng tiền đơn khác tổng các dòng',
           (SELECT COUNT(*) FROM purchase_orders po
            WHERE po.total_amount <> ISNULL((SELECT SUM(i.total_price) FROM purchase_order_items i WHERE i.purchase_order_id = po.id), 0))
    UNION ALL
    SELECT 8, N'Sản phẩm đang kinh doanh không có nhà cung cấp',
           (SELECT COUNT(*) FROM products WHERE status = 'ACTIVE' AND supplier_id IS NULL)
) k
ORDER BY thu_tu;

-- ============================================================ 3. mức sẵn sàng cho AI
-- >= 14 ngày: AI dùng mô hình; 7-13: trung bình động; < 7: không đủ dữ liệu (AI trả nhu cầu 0 và cảnh báo).
;WITH hist AS (
    SELECT p.id AS product_id, p.sku,
           COUNT(DISTINCT CAST(t.created_at AS DATE)) AS so_ngay_co_ban
    FROM products p
    LEFT JOIN inventory_transactions t
           ON t.product_id = p.id AND t.transaction_type = 'ISSUING'
          AND t.created_at >= DATEADD(DAY, -90, SYSDATETIME())
    WHERE p.status = 'ACTIVE'
    GROUP BY p.id, p.sku
)
SELECT
    SUM(CASE WHEN so_ngay_co_ban >= 14 THEN 1 ELSE 0 END)                         AS dung_mo_hinh,
    SUM(CASE WHEN so_ngay_co_ban BETWEEN 7 AND 13 THEN 1 ELSE 0 END)              AS trung_binh_dong,
    SUM(CASE WHEN so_ngay_co_ban < 7 THEN 1 ELSE 0 END)                           AS khong_du_du_lieu,
    COUNT(*)                                                                      AS tong_san_pham
FROM hist;

-- Chi tiết từng sản phẩm (thiếu dữ liệu lên trước)
;WITH hist AS (
    SELECT p.sku, p.name,
           COUNT(DISTINCT CAST(t.created_at AS DATE)) AS so_ngay_co_ban,
           ISNULL(SUM(t.quantity), 0) AS tong_ban_90_ngay
    FROM products p
    LEFT JOIN inventory_transactions t
           ON t.product_id = p.id AND t.transaction_type = 'ISSUING'
          AND t.created_at >= DATEADD(DAY, -90, SYSDATETIME())
    WHERE p.status = 'ACTIVE'
    GROUP BY p.sku, p.name
)
SELECT sku, name, so_ngay_co_ban, tong_ban_90_ngay,
       CASE WHEN so_ngay_co_ban >= 14 THEN N'Mô hình AI'
            WHEN so_ngay_co_ban >= 7  THEN N'Trung bình động'
            ELSE N'Không đủ dữ liệu' END AS nguon_du_bao
FROM hist
ORDER BY so_ngay_co_ban, sku;
