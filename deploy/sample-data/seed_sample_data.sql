/* =============================================================================
   DỮ LIỆU MẪU (SQL Server)
   Chạy SAU KHI backend đã khởi động ít nhất một lần (để Flyway tạo bảng và tạo user admin).
   An toàn khi chạy lại: nếu đã có sản phẩm SI-* thì bỏ qua.
   Mọi bản ghi mẫu có mã bắt đầu bằng SI- để xóa bằng reset_sample_data.sql.

   Kịch bản (kho SI-WH1, 90 ngày xuất kho mô phỏng, trừ SI-FAN chỉ 10 ngày):
   - SI-MOUSE    bán ~20/ngày, tồn 60              -> cần ĐẶT NGAY (khẩn cấp)
   - SI-KEYBOARD bán ~10/ngày, tồn 400             -> đủ hàng, không đề xuất
   - SI-HEADSET  bán ~6/ngày,  tồn 55 (+PO nháp)   -> đề xuất; PO nháp KHÔNG được tính
   - SI-CABLE    bán ~35/ngày, tồn 90 (đủ ~2,5 ngày < lead time 3 ngày), PO 500 cái hẹn sau 15 ngày
                  -> đã đặt đủ nhưng hàng về TRỄ -> "Giục hàng đang về"
   - SI-LAPTOP   bán ~3/ngày,  tồn 12, NCC lead time 14 ngày, độ tin cậy 0,70
   - SI-MONITOR  bán ~5/ngày,  tồn 90, PO sẽ về sau 3 ngày -> không cần đặt
   - SI-LAMP     bán ~1/ngày (chậm, ngắt quãng), tồn 300 -> dư hàng
   - SI-FAN      mới bán 10 ngày (<14) -> AI dùng trung bình đơn giản và cảnh báo thiếu lịch sử
   Nhà cung cấp B có 3 đơn đã nhận (lead time thực tế 8, 9, 10 ngày) -> AI dùng số thực tế 9 ngày thay vì 7 ngày khai báo.
   ============================================================================= */
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @admin BIGINT = (SELECT TOP 1 id FROM users WHERE username = 'admin');
IF @admin IS NULL
    THROW 50001, N'Chua co user admin. Hay chay backend (profile dev) it nhat mot lan roi chay lai script.', 1;

IF EXISTS (SELECT 1 FROM products WHERE sku LIKE 'SI-%')
BEGIN
    PRINT N'Du lieu mau da ton tai - bo qua. (Chay reset_sample_data.sql neu muon nap lai.)';
    RETURN;
END;

BEGIN TRAN;

DECLARE @today DATE = CAST(GETDATE() AS DATE);

-- ---------------------------------------------------------------- danh mục, NCC, kho
INSERT INTO categories (code, name, description) VALUES
    ('SI-CAT-PC',   N'Phụ kiện máy tính', N'Dữ liệu mẫu'),
    ('SI-CAT-HOME', N'Gia dụng',          N'Dữ liệu mẫu');

INSERT INTO suppliers (code, name, contact_name, email, phone, address, lead_time_days, reliability_score, status) VALUES
    ('SI-SUP-A', N'Công ty An Phát',   N'Anh Phát', 'anphat@example.vn', '0901000001', N'Đà Nẵng', 3,  1.00, 'ACTIVE'),
    ('SI-SUP-B', N'Công ty Bình Minh', N'Chị Minh', 'binhminh@example.vn', '0901000002', N'Hà Nội', 7,  0.90, 'ACTIVE'),
    ('SI-SUP-C', N'Công ty Cửu Long',  N'Anh Long', 'cuulong@example.vn', '0901000003', N'TP.HCM', 14, 0.70, 'ACTIVE');

INSERT INTO warehouses (code, name, address, phone, status) VALUES
    ('SI-WH1', N'Kho Đà Nẵng', N'12 Nguyễn Văn Linh, Đà Nẵng', '0236000001', 'ACTIVE'),
    ('SI-WH2', N'Kho TP.HCM',  N'45 Võ Văn Kiệt, TP.HCM',      '0286000002', 'ACTIVE');

DECLARE @wh1 BIGINT = (SELECT id FROM warehouses WHERE code = 'SI-WH1');
DECLARE @wh2 BIGINT = (SELECT id FROM warehouses WHERE code = 'SI-WH2');

-- ---------------------------------------------------------------- sản phẩm
CREATE TABLE #sample (
    sku NVARCHAR(50), name NVARCHAR(150), cat NVARCHAR(30), sup NVARCHAR(30),
    buy DECIMAL(12,2), sell DECIMAL(12,2), minl INT, maxl INT,
    daily INT, stock INT, reserved INT, hist INT
);
INSERT INTO #sample VALUES
    ('SI-MOUSE',    N'Chuột không dây',   'SI-CAT-PC',   'SI-SUP-B',   180000,  250000, 30, 400, 20,  60, 5, 90),
    ('SI-KEYBOARD', N'Bàn phím cơ',       'SI-CAT-PC',   'SI-SUP-A',   450000,  650000, 20, 300, 10, 400, 0, 90),
    ('SI-HEADSET',  N'Tai nghe chụp tai', 'SI-CAT-PC',   'SI-SUP-B',   650000,  900000, 15, 200,  6,  55, 0, 90),
    ('SI-CABLE',    N'Cáp USB-C',         'SI-CAT-PC',   'SI-SUP-A',    60000,   90000, 50, 800, 35,  90, 0, 90),
    ('SI-LAPTOP',   N'Laptop văn phòng',  'SI-CAT-PC',   'SI-SUP-C', 14000000, 18500000,  5,  60,  3,  12, 0, 90),
    ('SI-MONITOR',  N'Màn hình 24 inch',  'SI-CAT-PC',   'SI-SUP-B',  3000000,  4200000,  8, 150,  5,  90, 0, 90),
    ('SI-LAMP',     N'Đèn bàn LED',       'SI-CAT-HOME', 'SI-SUP-A',   200000,   320000, 10, 100,  1, 300, 0, 90),
    ('SI-FAN',      N'Quạt mini USB',     'SI-CAT-HOME', 'SI-SUP-A',    90000,   150000, 10, 200,  8,  40, 0, 10);

INSERT INTO products (sku, barcode, name, category_id, supplier_id, unit, purchase_price, selling_price,
                      min_stock_level, max_stock_level, status)
SELECT d.sku, 'BC-' + d.sku, d.name, c.id, s.id, N'Cái', d.buy, d.sell, d.minl, d.maxl, 'ACTIVE'
FROM #sample d
JOIN categories c ON c.code = d.cat
JOIN suppliers  s ON s.code = d.sup;

-- ---------------------------------------------------------------- lịch sử xuất kho (nhu cầu)
-- Mỗi sản phẩm/ngày một giao dịch ISSUING. Số lượng = mức bán × hệ số thứ trong tuần × nhiễu 0,8..1,2.
-- Số dư chạy ngược từ tồn hiện tại nên Lịch sử giao dịch luôn khớp tồn kho.
;WITH n AS (
    SELECT TOP (90) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS k
    FROM sys.all_objects a CROSS JOIN sys.all_objects b
)
SELECT p.id AS product_id, d.sku, d.stock, d.hist,
       DATEADD(DAY, -n.k, @today) AS day_date,
       n.k,
       CAST(ROUND(d.daily
            * CASE (DATEDIFF(DAY, '19000101', DATEADD(DAY, -n.k, @today)) % 7)  -- 0 = thứ Hai
                  WHEN 4 THEN 1.20 WHEN 5 THEN 1.35 WHEN 6 THEN 0.80 ELSE 1.00 END
            * (0.80 + (ABS(CHECKSUM(p.id, n.k)) % 41) / 100.0), 0) AS INT) AS qty
INTO #sales
FROM #sample d
JOIN products p ON p.sku = d.sku
JOIN n ON n.k <= d.hist;

DELETE FROM #sales WHERE qty <= 0;

-- số dư sau mỗi ngày = tồn đầu - xuất lũy kế (cũ -> mới); ngày cuối = tồn hiện tại
SELECT s.product_id, s.sku, s.day_date, s.qty,
       (s.stock + t.total_qty)
         - SUM(s.qty) OVER (PARTITION BY s.product_id ORDER BY s.day_date ROWS UNBOUNDED PRECEDING) AS balance_after
INTO #ledger
FROM #sales s
JOIN (SELECT product_id, SUM(qty) AS total_qty FROM #sales GROUP BY product_id) t ON t.product_id = s.product_id;

-- tồn đầu kỳ (nhập kho một lần trước ngày bán đầu tiên)
INSERT INTO inventory_transactions
    (transaction_code, transaction_no, line_no, transaction_type, product_id, source_warehouse_id,
     destination_warehouse_id, quantity, balance_before, balance_after, reference_doc, reason, created_by, created_at)
SELECT 'SI-OPEN-' + s.sku, 'SI-OPEN-' + s.sku, 1, 'RECEIVING', s.product_id, NULL, @wh1,
       s.stock + t.total_qty, 0, s.stock + t.total_qty, N'SI-OPENING', N'Tồn đầu kỳ', @admin,
       DATEADD(HOUR, 8, CAST(DATEADD(DAY, -(s.hist + 1), @today) AS DATETIME2))
FROM (SELECT DISTINCT product_id, sku, stock, hist FROM #sales) s
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

-- ---------------------------------------------------------------- tồn kho hiện tại
INSERT INTO inventories (product_id, warehouse_id, current_stock, reserved_stock, location_in_warehouse, last_stock_count_at)
SELECT p.id, @wh1, d.stock, d.reserved, 'A-01', SYSDATETIME()
FROM #sample d JOIN products p ON p.sku = d.sku;

-- kho 2: vài mặt hàng để thử chuyển kho
INSERT INTO inventories (product_id, warehouse_id, current_stock, reserved_stock, location_in_warehouse, last_stock_count_at)
SELECT p.id, @wh2, 80, 0, 'B-01', SYSDATETIME()
FROM products p WHERE p.sku IN ('SI-MOUSE', 'SI-CABLE', 'SI-KEYBOARD');

-- ---------------------------------------------------------------- đơn đặt hàng
DECLARE @supA BIGINT = (SELECT id FROM suppliers WHERE code = 'SI-SUP-A');
DECLARE @supB BIGINT = (SELECT id FROM suppliers WHERE code = 'SI-SUP-B');
DECLARE @mouse BIGINT = (SELECT id FROM products WHERE sku = 'SI-MOUSE');
DECLARE @cable BIGINT = (SELECT id FROM products WHERE sku = 'SI-CABLE');
DECLARE @headset BIGINT = (SELECT id FROM products WHERE sku = 'SI-HEADSET');
DECLARE @monitor BIGINT = (SELECT id FROM products WHERE sku = 'SI-MONITOR');
DECLARE @po BIGINT;
DECLARE @orderDt DATETIME2;

-- 3 đơn đã nhận của NCC B: lead time thực tế 8, 9, 10 ngày (khai báo 7)
SET @orderDt = CAST(DATEADD(DAY, -70, @today) AS DATETIME2);
INSERT INTO purchase_orders (po_number, supplier_id, destination_warehouse_id, status, order_date, expected_delivery_date, actual_delivery_date, total_amount, note, created_by)
VALUES ('SI-PO-H1', @supB, @wh1, 'RECEIVED', @orderDt, DATEADD(DAY, -63, @today), DATEADD(DAY, -62, @today), 18000000, N'Đơn lịch sử', @admin);
SET @po = SCOPE_IDENTITY();
INSERT INTO purchase_order_items (purchase_order_id, product_id, ordered_qty, received_qty, unit_price, total_price) VALUES (@po, @mouse, 100, 100, 180000, 18000000);

SET @orderDt = CAST(DATEADD(DAY, -50, @today) AS DATETIME2);
INSERT INTO purchase_orders (po_number, supplier_id, destination_warehouse_id, status, order_date, expected_delivery_date, actual_delivery_date, total_amount, note, created_by)
VALUES ('SI-PO-H2', @supB, @wh1, 'RECEIVED', @orderDt, DATEADD(DAY, -43, @today), DATEADD(DAY, -41, @today), 18000000, N'Đơn lịch sử', @admin);
SET @po = SCOPE_IDENTITY();
INSERT INTO purchase_order_items (purchase_order_id, product_id, ordered_qty, received_qty, unit_price, total_price) VALUES (@po, @mouse, 100, 100, 180000, 18000000);

SET @orderDt = CAST(DATEADD(DAY, -30, @today) AS DATETIME2);
INSERT INTO purchase_orders (po_number, supplier_id, destination_warehouse_id, status, order_date, expected_delivery_date, actual_delivery_date, total_amount, note, created_by)
VALUES ('SI-PO-H3', @supB, @wh1, 'RECEIVED', @orderDt, DATEADD(DAY, -23, @today), DATEADD(DAY, -20, @today), 18000000, N'Đơn lịch sử', @admin);
SET @po = SCOPE_IDENTITY();
INSERT INTO purchase_order_items (purchase_order_id, product_id, ordered_qty, received_qty, unit_price, total_price) VALUES (@po, @mouse, 100, 100, 180000, 18000000);

-- Màn hình: đơn đã gửi, sẽ về sau 3 ngày -> AI thấy đủ hàng về kịp
INSERT INTO purchase_orders (po_number, supplier_id, destination_warehouse_id, status, order_date, expected_delivery_date, total_amount, note, created_by, approved_by)
VALUES ('SI-PO-S1', @supB, @wh1, 'SENT', DATEADD(DAY, -4, CAST(@today AS DATETIME2)), DATEADD(DAY, 3, @today), 180000000, N'Đơn đang về đúng hạn', @admin, @admin);
SET @po = SCOPE_IDENTITY();
INSERT INTO purchase_order_items (purchase_order_id, product_id, ordered_qty, received_qty, unit_price, total_price) VALUES (@po, @monitor, 60, 0, 3000000, 180000000);

-- Cáp USB-C: đơn đã gửi nhưng hẹn giao sau 15 ngày, trong khi tồn chỉ đủ ~4 ngày -> "giục hàng đang về"
INSERT INTO purchase_orders (po_number, supplier_id, destination_warehouse_id, status, order_date, expected_delivery_date, total_amount, note, created_by, approved_by)
VALUES ('SI-PO-S2', @supA, @wh1, 'SENT', DATEADD(DAY, -2, CAST(@today AS DATETIME2)), DATEADD(DAY, 15, @today), 30000000, N'Đơn hẹn giao trễ', @admin, @admin);
SET @po = SCOPE_IDENTITY();
INSERT INTO purchase_order_items (purchase_order_id, product_id, ordered_qty, received_qty, unit_price, total_price) VALUES (@po, @cable, 500, 0, 60000, 30000000);

-- Tai nghe: chỉ là đơn NHÁP -> không được tính là hàng đang về
INSERT INTO purchase_orders (po_number, supplier_id, destination_warehouse_id, status, order_date, expected_delivery_date, total_amount, note, created_by)
VALUES ('SI-PO-D1', @supB, @wh1, 'DRAFT', SYSDATETIME(), DATEADD(DAY, 7, @today), 65000000, N'Đơn nháp chưa gửi', @admin);
SET @po = SCOPE_IDENTITY();
INSERT INTO purchase_order_items (purchase_order_id, product_id, ordered_qty, received_qty, unit_price, total_price) VALUES (@po, @headset, 100, 0, 650000, 65000000);

DROP TABLE #ledger;
DROP TABLE #sales;
DROP TABLE #sample;

COMMIT;
PRINT N'Da nap du lieu mau: 8 san pham, 2 kho, 3 nha cung cap, 6 don dat hang, ~90 ngay xuat kho.';
