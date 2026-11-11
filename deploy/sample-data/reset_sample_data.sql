/* Xóa toàn bộ dữ liệu mẫu (mã SI-*, và mã DEMO-* của bản cũ), kể cả đề xuất AI, đơn đặt hàng và giao dịch tạo từ chúng. */
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRAN;

DECLARE @prod TABLE (id BIGINT);
INSERT INTO @prod SELECT id FROM products WHERE (sku LIKE 'SI-%' OR sku LIKE 'DEMO-%');
DECLARE @wh TABLE (id BIGINT);
INSERT INTO @wh SELECT id FROM warehouses WHERE (code LIKE 'SI-%' OR code LIKE 'DEMO-%');

DELETE FROM reorder_recommendations WHERE product_id IN (SELECT id FROM @prod) OR warehouse_id IN (SELECT id FROM @wh);
DELETE FROM purchase_order_items WHERE product_id IN (SELECT id FROM @prod)
    OR purchase_order_id IN (SELECT id FROM purchase_orders WHERE (po_number LIKE 'SI-%' OR po_number LIKE 'DEMO-%'));
DELETE FROM purchase_orders WHERE (po_number LIKE 'SI-%' OR po_number LIKE 'DEMO-%')
    OR destination_warehouse_id IN (SELECT id FROM @wh)
    OR supplier_id IN (SELECT id FROM suppliers WHERE (code LIKE 'SI-%' OR code LIKE 'DEMO-%'));
DELETE FROM inventory_transactions WHERE product_id IN (SELECT id FROM @prod)
    OR source_warehouse_id IN (SELECT id FROM @wh) OR destination_warehouse_id IN (SELECT id FROM @wh);
DELETE FROM inventories WHERE product_id IN (SELECT id FROM @prod) OR warehouse_id IN (SELECT id FROM @wh);
DELETE FROM products WHERE id IN (SELECT id FROM @prod);
DELETE FROM suppliers WHERE (code LIKE 'SI-%' OR code LIKE 'DEMO-%');
DELETE FROM warehouses WHERE (code LIKE 'SI-%' OR code LIKE 'DEMO-%');
DELETE FROM categories WHERE (code LIKE 'SI-%' OR code LIKE 'DEMO-%');

COMMIT;
PRINT N'Da xoa du lieu mau.';
