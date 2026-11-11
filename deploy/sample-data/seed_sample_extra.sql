/* =============================================================================
   DỮ LIỆU MẪU BỔ SUNG (chạy SAU seed_sample_data.sql)

   Mục đích: phủ các tình huống mà seed chính chưa có, để Dashboard, Cảnh báo, Lịch sử
   giao dịch và Đơn đặt hàng có đủ trạng thái để trình bày:
   - SI-PRINTER : HẾT HÀNG (tồn 0)                    -> cảnh báo out-of-stock, đề xuất khẩn cấp
   - SI-SSD     : SẮP HẾT (tồn 8 < tồn tối thiểu 15)  -> cảnh báo low-stock
   - SI-WEBCAM  : DƯ HÀNG (tồn 260 > tối đa 120)      -> trạng thái Over Stock, có điều chỉnh kiểm kê
   - SI-ROUTER  : bình thường, có CHUYỂN KHO sang kho 2 và đơn NHẬN MỘT PHẦN
   - Đơn PARTIALLY_RECEIVED (SI-PO-P1) và đơn CANCELLED (SI-PO-X1)
   - Sửa tính nhất quán: tồn kho 2 của seed chính (80 cái/mặt hàng) chưa có giao dịch nhập
     -> bổ sung giao dịch nhập đầu kỳ để Lịch sử giao dịch khớp tồn kho.

   An toàn khi chạy lại (bỏ qua nếu đã có). Mọi bản ghi mang mã SI-* nên
   reset_sample_data.sql xóa được toàn bộ (cả seed chính lẫn seed bổ sung).
   ============================================================================= */
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @admin BIGINT = (SELECT TOP 1 id FROM users WHERE username = 'admin');
IF @admin IS NULL
    THROW 50001, N'Chua co user admin. Hay chay backend (profile dev) it nhat mot lan roi chay lai script.', 1;

IF NOT EXISTS (SELECT 1 FROM products WHERE sku = 'SI-MOUSE')
    THROW 50002, N'Hay chay seed_sample_data.sql truoc, sau do moi chay file nay.', 1;

IF EXISTS (SELECT 1 FROM products WHERE sku = 'SI-ROUTER')
BEGIN
    PRINT N'Du lieu mau bo sung da ton tai - bo qua.';
    RETURN;
END;

BEGIN TRAN;

DECLARE @today DATE = CAST(GETDATE() AS DATE);
DECLARE @wh1 BIGINT = (SELECT id FROM warehouses WHERE code = 'SI-WH1');
DECLARE @wh2 BIGINT = (SELECT id FROM warehouses WHERE code = 'SI-WH2');

-- ---------------------------------------------------------------- 1. nhập đầu kỳ cho kho 2 của seed chính
INSERT INTO inventory_transactions
    (transaction_code, transaction_no, line_no, transaction_type, product_id, source_warehouse_id,
     destination_warehouse_id, quantity, balance_before, balance_after, reference_doc, reason, created_by, created_at)
SELECT 'SI-OPEN2-' + p.sku, 'SI-OPEN2-' + p.sku, 1, 'RECEIVING', p.id, NULL, @wh2,
       i.current_stock, 0, i.current_stock, N'SI-OPENING', N'Tồn đầu kỳ kho 2', @admin,
       DATEADD(HOUR, 8, CAST(DATEADD(DAY, -91, @today) AS DATETIME2))
FROM inventories i
JOIN products p ON p.id = i.product_id
WHERE i.warehouse_id = @wh2
  AND p.sku IN ('SI-MOUSE', 'SI-CABLE', 'SI-KEYBOARD')
  AND NOT EXISTS (SELECT 1 FROM inventory_transactions t
                  WHERE t.product_id = p.id AND t.destination_warehouse_id = @wh2);

-- ---------------------------------------------------------------- 2. sản phẩm bổ sung
-- end_stock  = tồn ở cuối chuỗi bán hàng (trước các thao tác đặc biệt bên dưới)
-- final_stock = tồn hiện tại ở kho 1 sau mọi thao tác
CREATE TABLE #x (
    sku NVARCHAR(50), name NVARCHAR(150), cat NVARCHAR(30), sup NVARCHAR(30),
    buy DECIMAL(12,2), sell DECIMAL(12,2), minl INT, maxl INT,
    daily INT, end_stock INT, final_stock INT, hist INT
);
INSERT INTO #x VALUES
    ('SI-PRINTER', N'Máy in laser',        'SI-CAT-PC',   'SI-SUP-C', 3500000, 4800000, 4,  40,  2,   0,   0, 60),
    ('SI-SSD',     N'Ổ cứng SSD 512GB',    'SI-CAT-PC',   'SI-SUP-A',  900000, 1300000, 15, 200,  4,   8,   8, 60),
    ('SI-WEBCAM',  N'Webcam Full HD',      'SI-CAT-PC',   'SI-SUP-B',  350000,  520000, 10, 120,  1, 262, 260, 60),
    ('SI-ROUTER',  N'Bộ phát Wi-Fi',       'SI-CAT-PC',   'SI-SUP-B',  600000,  890000, 20, 250,  6, 140, 150, 60);

INSERT INTO products (sku, barcode, name, category_id, supplier_id, unit, purchase_price, selling_price,
                      min_stock_level, max_stock_level, status)
SELECT d.sku, 'BC-' + d.sku, d.name, c.id, s.id, N'Cái', d.buy, d.sell, d.minl, d.maxl, 'ACTIVE'
FROM #x d
JOIN categories c ON c.code = d.cat
JOIN suppliers  s ON s.code = d.sup;

-- ---------------------------------------------------------------- 3. lịch sử xuất kho (cùng cách tính với seed chính)
;WITH n AS (
    SELECT TOP (60) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS k
    FROM sys.all_objects a CROSS JOIN sys.all_objects b
)
SELECT p.id AS product_id, d.sku, d.end_stock, d.hist,
       DATEADD(DAY, -n.k, @today) AS day_date,
       n.k,
       CAST(ROUND(d.daily
            * CASE (DATEDIFF(DAY, '19000101', DATEADD(DAY, -n.k, @today)) % 7)
                  WHEN 4 THEN 1.20 WHEN 5 THEN 1.35 WHEN 6 THEN 0.80 ELSE 1.00 END
            * (0.80 + (ABS(CHECKSUM(p.id, n.k)) % 41) / 100.0), 0) AS INT) AS qty
INTO #sales
FROM #x d
JOIN products p ON p.sku = d.sku
JOIN n ON n.k <= d.hist;

DELETE FROM #sales WHERE qty <= 0;

SELECT s.product_id, s.sku, s.day_date, s.qty,
       (s.end_stock + t.total_qty)
         - SUM(s.qty) OVER (PARTITION BY s.product_id ORDER BY s.day_date ROWS UNBOUNDED PRECEDING) AS balance_after
INTO #ledger
FROM #sales s
JOIN (SELECT product_id, SUM(qty) AS total_qty FROM #sales GROUP BY product_id) t ON t.product_id = s.product_id;

INSERT INTO inventory_transactions
    (transaction_code, transaction_no, line_no, transaction_type, product_id, source_warehouse_id,
     destination_warehouse_id, quantity, balance_before, balance_after, reference_doc, reason, created_by, created_at)
SELECT 'SI-OPEN-' + s.sku, 'SI-OPEN-' + s.sku, 1, 'RECEIVING', s.product_id, NULL, @wh1,
       s.end_stock + t.total_qty, 0, s.end_stock + t.total_qty, N'SI-OPENING', N'Tồn đầu kỳ', @admin,
       DATEADD(HOUR, 8, CAST(DATEADD(DAY, -(s.hist + 1), @today) AS DATETIME2))
FROM (SELECT DISTINCT product_id, sku, end_stock, hist FROM #sales) s
JOIN (SELECT product_id, SUM(qty) AS total_qty FROM #sales GROUP BY product_id) t ON t.product_id = s.product_id;

INSERT INTO inventory_transactions
    (transaction_code, transaction_no, line_no, transaction_type, product_id, source_warehouse_id,
     destination_warehouse_id, quantity, balance_before, balance_after, reference_doc, reason, created_by, created_at)
SELECT 'SI-' + l.sku + '-' + CONVERT(CHAR(8), l.day_date, 112),
       'SI-' + l.sku + '-' + CONVERT(CHAR(8), l.day_date, 112),
       1, 'ISSUING', l.product_id, @wh1, NULL, l.qty, l.balance_after + l.qty, l.balance_after,
       N'SI-SALES', N'Xuất bán hàng', @admin,
       DATEADD(HOUR, 10, CAST(l.day_date AS DATETIME2))
FROM #ledger l;

-- ---------------------------------------------------------------- 4. tồn kho hiện tại
INSERT INTO inventories (product_id, warehouse_id, current_stock, reserved_stock, location_in_warehouse, last_stock_count_at)
SELECT p.id, @wh1, d.final_stock, 0, 'C-01', SYSDATETIME()
FROM #x d JOIN products p ON p.sku = d.sku;

-- ---------------------------------------------------------------- 5. thao tác đặc biệt
DECLARE @webcam BIGINT = (SELECT id FROM products WHERE sku = 'SI-WEBCAM');
DECLARE @router BIGINT = (SELECT id FROM products WHERE sku = 'SI-ROUTER');
DECLARE @ssd    BIGINT = (SELECT id FROM products WHERE sku = 'SI-SSD');
DECLARE @laptop BIGINT = (SELECT id FROM products WHERE sku = 'SI-LAPTOP');

-- 5a. Điều chỉnh kiểm kê: webcam 262 -> 260 (hao hụt 2 cái). Với ADJUSTMENT, quantity là tồn mới.
INSERT INTO inventory_transactions
    (transaction_code, transaction_no, line_no, transaction_type, product_id, source_warehouse_id,
     destination_warehouse_id, quantity, balance_before, balance_after, reference_doc, reason, created_by, created_at)
VALUES ('SI-ADJ-WEBCAM', 'SI-ADJ-WEBCAM', 1, 'ADJUSTMENT', @webcam, @wh1, NULL,
        260, 262, 260, N'SI-COUNT', N'Kiểm kê định kỳ: lệch 2 cái', @admin,
        DATEADD(HOUR, 16, CAST(DATEADD(DAY, -1, @today) AS DATETIME2)));

-- 5b. Chuyển kho: router 30 cái từ kho 1 sang kho 2 (hai dòng cùng transaction_no)
INSERT INTO inventory_transactions
    (transaction_code, transaction_no, line_no, transaction_type, product_id, source_warehouse_id,
     destination_warehouse_id, quantity, balance_before, balance_after, reference_doc, reason, created_by, created_at)
VALUES ('SI-TRF-ROUTER-OUT', 'SI-TRF-ROUTER', 1, 'TRANSFER_OUT', @router, @wh1, @wh2,
        30, 140, 110, N'SI-TRANSFER', N'Chuyển kho cân đối tồn', @admin,
        DATEADD(HOUR, 17, CAST(DATEADD(DAY, -1, @today) AS DATETIME2))),
       ('SI-TRF-ROUTER-IN',  'SI-TRF-ROUTER', 2, 'TRANSFER_IN',  @router, @wh1, @wh2,
        30, 0, 30, N'SI-TRANSFER', N'Chuyển kho cân đối tồn', @admin,
        DATEADD(HOUR, 17, CAST(DATEADD(DAY, -1, @today) AS DATETIME2)));

INSERT INTO inventories (product_id, warehouse_id, current_stock, reserved_stock, location_in_warehouse, last_stock_count_at)
VALUES (@router, @wh2, 30, 0, 'B-02', SYSDATETIME());

-- ---------------------------------------------------------------- 6. đơn đặt hàng bổ sung
DECLARE @supA BIGINT = (SELECT id FROM suppliers WHERE code = 'SI-SUP-A');
DECLARE @supB BIGINT = (SELECT id FROM suppliers WHERE code = 'SI-SUP-B');
DECLARE @supC BIGINT = (SELECT id FROM suppliers WHERE code = 'SI-SUP-C');
DECLARE @po BIGINT;

-- 6a. NHẬN MỘT PHẦN: router đặt 100, đã nhận 40 (giao dịch nhập kho nằm sau chuyển kho, cùng ngày hôm qua)
INSERT INTO purchase_orders (po_number, supplier_id, destination_warehouse_id, status, order_date, expected_delivery_date, total_amount, note, created_by, approved_by)
VALUES ('SI-PO-P1', @supB, @wh1, 'PARTIALLY_RECEIVED', DATEADD(DAY, -8, CAST(@today AS DATETIME2)), DATEADD(DAY, 4, @today), 60000000, N'Đơn đã nhận một phần', @admin, @admin);
SET @po = SCOPE_IDENTITY();
INSERT INTO purchase_order_items (purchase_order_id, product_id, ordered_qty, received_qty, unit_price, total_price)
VALUES (@po, @router, 100, 40, 600000, 60000000);

INSERT INTO inventory_transactions
    (transaction_code, transaction_no, line_no, transaction_type, product_id, source_warehouse_id,
     destination_warehouse_id, quantity, balance_before, balance_after, reference_doc, reason, created_by, created_at)
VALUES ('SI-RCV-P1', 'SI-RCV-P1', 1, 'RECEIVING', @router, NULL, @wh1,
        40, 110, 150, N'SI-PO-P1', N'Nhận hàng theo đơn SI-PO-P1', @admin,
        DATEADD(HOUR, 18, CAST(DATEADD(DAY, -1, @today) AS DATETIME2)));

-- 6b. ĐÃ HỦY: laptop đặt rồi hủy trước khi nhận hàng (không có giao dịch kho)
INSERT INTO purchase_orders (po_number, supplier_id, destination_warehouse_id, status, order_date, expected_delivery_date, total_amount, note, created_by)
VALUES ('SI-PO-X1', @supC, @wh1, 'CANCELLED', DATEADD(DAY, -12, CAST(@today AS DATETIME2)), DATEADD(DAY, 2, @today), 70000000, N'Đơn đã hủy do đổi nhà cung cấp', @admin);
SET @po = SCOPE_IDENTITY();
INSERT INTO purchase_order_items (purchase_order_id, product_id, ordered_qty, received_qty, unit_price, total_price)
VALUES (@po, @laptop, 5, 0, 14000000, 70000000);

-- 6c. SSD: đơn NHÁP (chưa tính là hàng đang về)
INSERT INTO purchase_orders (po_number, supplier_id, destination_warehouse_id, status, order_date, expected_delivery_date, total_amount, note, created_by)
VALUES ('SI-PO-D2', @supA, @wh1, 'DRAFT', SYSDATETIME(), DATEADD(DAY, 3, @today), 90000000, N'Đơn nháp bổ sung hàng sắp hết', @admin);
SET @po = SCOPE_IDENTITY();
INSERT INTO purchase_order_items (purchase_order_id, product_id, ordered_qty, received_qty, unit_price, total_price)
VALUES (@po, @ssd, 100, 0, 900000, 90000000);

DROP TABLE #ledger;
DROP TABLE #sales;
DROP TABLE #x;

COMMIT;
PRINT N'Da nap du lieu mau bo sung: 4 san pham (het hang, sap het, du hang, chuyen kho), 3 don dat hang (nhan mot phan, da huy, nhap).';
