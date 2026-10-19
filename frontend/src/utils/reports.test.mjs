import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getOwningWarehouseId,
  getSignedDelta,
  filterTransactionsForReport,
  buildTransactionReport,
  buildInventoryReport,
  getRowStockStatus,
  isValidKpis,
  isValidTransactionReport,
  isValidInventoryReport,
  toCsv,
  INVENTORY_CSV_COLUMNS,
} from './reports.js';
import { calculateKpis } from './dashboard.js';

// ───────── Dữ liệu mẫu ─────────
// Giờ địa phương, không có "Z" → so sánh theo ngày địa phương nhất quán trên mọi máy.
const TX = [
  { id: 1, transactionCode: 'T1', transactionType: 'RECEIVING', productId: 1, destinationWarehouseId: 10, quantity: 100, balanceBefore: 0, balanceAfter: 100, createdAt: '2026-10-01T08:00:00' },
  { id: 2, transactionCode: 'T2', transactionType: 'ISSUING', productId: 1, sourceWarehouseId: 10, quantity: 30, balanceBefore: 100, balanceAfter: 70, createdAt: '2026-10-05T23:59:30' },
  // Một lần chuyển kho 10 → 20: 2 dòng cùng số lượng
  { id: 3, transactionCode: 'T3-OUT', transactionType: 'TRANSFER_OUT', productId: 1, sourceWarehouseId: 10, destinationWarehouseId: 20, quantity: 20, balanceBefore: 70, balanceAfter: 50, createdAt: '2026-10-10T09:00:00' },
  { id: 4, transactionCode: 'T3-IN', transactionType: 'TRANSFER_IN', productId: 1, sourceWarehouseId: 10, destinationWarehouseId: 20, quantity: 20, balanceBefore: 0, balanceAfter: 20, createdAt: '2026-10-10T09:00:00' },
  { id: 5, transactionCode: 'T5', transactionType: 'ADJUSTMENT', productId: 2, sourceWarehouseId: 10, quantity: 8, balanceBefore: 12, balanceAfter: 8, createdAt: '2026-10-12T10:00:00' },
];

test('getOwningWarehouseId - kho sở hữu giao dịch theo cách backend ghi', () => {
  assert.equal(getOwningWarehouseId(TX[0]), 10); // RECEIVING → đích
  assert.equal(getOwningWarehouseId(TX[1]), 10); // ISSUING → nguồn
  assert.equal(getOwningWarehouseId(TX[2]), 10); // TRANSFER_OUT → nguồn
  assert.equal(getOwningWarehouseId(TX[3]), 20); // TRANSFER_IN → đích
  assert.equal(getOwningWarehouseId(TX[4]), 10); // ADJUSTMENT → nguồn
  assert.equal(getOwningWarehouseId(null), null);
});

test('getSignedDelta - dấu biến động theo loại giao dịch; ADJUSTMENT theo chênh lệch số dư', () => {
  assert.equal(getSignedDelta(TX[0]), 100);
  assert.equal(getSignedDelta(TX[1]), -30);
  assert.equal(getSignedDelta(TX[2]), -20);
  assert.equal(getSignedDelta(TX[3]), 20);
  assert.equal(getSignedDelta(TX[4]), -4, 'điều chỉnh 12 → 8');
  assert.equal(getSignedDelta({ transactionType: 'ADJUSTMENT', quantity: 5 }), 0, 'thiếu số dư thì không đoán');
});

test('filterTransactionsForReport - khoảng ngày gồm cả hai đầu mút (cả ngày cuối)', () => {
  const ids = (list) => list.map((t) => t.id);
  // T2 lúc 23:59:30 ngày 05 phải nằm trong "đến ngày 05"
  assert.deepEqual(ids(filterTransactionsForReport(TX, { from: '2026-10-01', to: '2026-10-05' })), [1, 2]);
  assert.deepEqual(ids(filterTransactionsForReport(TX, { from: '2026-10-06' })), [3, 4, 5]);
  assert.deepEqual(ids(filterTransactionsForReport(TX, { to: '2026-09-30' })), []);
  assert.deepEqual(ids(filterTransactionsForReport(TX, { type: 'ISSUING' })), [2]);
  assert.deepEqual(ids(filterTransactionsForReport(TX, { productId: '2' })), [5]);
});

test('filterTransactionsForReport - lọc theo kho không đếm đôi giao dịch chuyển kho', () => {
  const ids = (list) => list.map((t) => t.id);
  assert.deepEqual(ids(filterTransactionsForReport(TX, { warehouseId: '10' })), [1, 2, 3, 5]);
  assert.deepEqual(ids(filterTransactionsForReport(TX, { warehouseId: '20' })), [4]);
});

test('buildTransactionReport - tổng hợp đúng số lượng, loại trùng, sắp mới → cũ', () => {
  const withDuplicate = [...TX, { ...TX[0] }]; // cùng id 1
  const { summary, byType, rows } = buildTransactionReport(withDuplicate);

  assert.equal(summary.totalCount, 5, 'giao dịch trùng id chỉ tính một lần');
  assert.equal(summary.receivedQuantity, 100);
  assert.equal(summary.issuedQuantity, 30);
  assert.equal(summary.transferredQuantity, 20, 'một lần chuyển (2 dòng) chỉ tính 20, không phải 40');
  assert.equal(summary.adjustmentCount, 1);
  // Toàn hệ thống: +100 -30 -4 (điều chỉnh); chuyển kho không đổi tổng tồn
  assert.equal(summary.netChange, 66);

  assert.equal(rows[0].id, 5, 'mới nhất lên đầu');
  assert.equal(rows[rows.length - 1].id, 1);

  const typeCount = Object.fromEntries(byType.map((t) => [t.type, t.count]));
  assert.deepEqual(typeCount, { RECEIVING: 1, ISSUING: 1, TRANSFER_IN: 1, TRANSFER_OUT: 1, ADJUSTMENT: 1 });
});

test('buildTransactionReport - khi lọc theo một kho, chuyển kho tính vào biến động ròng của kho đó', () => {
  const hn = buildTransactionReport(TX, { warehouseId: '10' }).summary;
  assert.equal(hn.netChange, 100 - 30 - 20 - 4); // = 46
  const hcm = buildTransactionReport(TX, { warehouseId: '20' }).summary;
  assert.equal(hcm.netChange, 20);
});

test('buildTransactionReport - danh sách rỗng không lỗi', () => {
  const { summary, rows } = buildTransactionReport([], { from: '2026-01-01' });
  assert.equal(summary.totalCount, 0);
  assert.equal(summary.netChange, 0);
  assert.deepEqual(rows, []);
});

// ───────── Báo cáo tồn kho ─────────

const PRODUCTS = [
  { id: 1, sku: 'A', name: 'Alpha', categoryId: 100, minStockLevel: 10, maxStockLevel: 200, purchasePrice: 1000 },
  { id: 2, sku: 'B', name: 'Bravo', categoryId: 200, minStockLevel: 20, purchasePrice: 500 },
  { id: 3, sku: 'C', name: 'Charlie', minStockLevel: 5, purchasePrice: 100 },
];
const CATEGORIES = [{ id: 100, name: 'Điện tử' }, { id: 200, name: 'Gia dụng' }];
const WAREHOUSES = [{ id: 10, code: 'HN', name: 'Kho Hà Nội', status: 'ACTIVE' }, { id: 20, code: 'HCM', name: 'Kho HCM', status: 'ACTIVE' }];
const INVENTORIES = [
  { id: 1, productId: 1, warehouseId: 10, currentStock: 50, reservedStock: 10 },
  { id: 2, productId: 1, warehouseId: 20, currentStock: 250, reservedStock: 0 }, // > max 200 → OVER
  { id: 3, productId: 2, warehouseId: 10, currentStock: 15, reservedStock: 0 }, // <= 20 → LOW
  { id: 4, productId: 3, warehouseId: 20, currentStock: 0, reservedStock: 0 }, // OUT
];

test('getRowStockStatus - ưu tiên stockStatus của backend, nếu thiếu thì tự tính như backend', () => {
  assert.equal(getRowStockStatus({ stockStatus: 'LOW_STOCK', currentStock: 999 }, null), 'LOW_STOCK');
  assert.equal(getRowStockStatus(INVENTORIES[0], PRODUCTS[0]), 'IN_STOCK');
  assert.equal(getRowStockStatus(INVENTORIES[1], PRODUCTS[0]), 'OVER_STOCK');
  assert.equal(getRowStockStatus(INVENTORIES[2], PRODUCTS[1]), 'LOW_STOCK');
  assert.equal(getRowStockStatus(INVENTORIES[3], PRODUCTS[2]), 'OUT_OF_STOCK');
});

test('buildInventoryReport - tổng hợp số lượng, giá trị, trạng thái', () => {
  const { summary, rows } = buildInventoryReport(INVENTORIES, PRODUCTS, CATEGORIES, WAREHOUSES);

  assert.equal(summary.rowCount, 4);
  assert.equal(summary.totalQuantity, 50 + 250 + 15 + 0);
  assert.equal(summary.totalReserved, 10);
  assert.equal(summary.totalAvailable, 40 + 250 + 15 + 0);
  assert.equal(summary.totalValue, 50 * 1000 + 250 * 1000 + 15 * 500 + 0);
  assert.equal(summary.lowStockCount, 1);
  assert.equal(summary.outOfStockCount, 1);
  assert.equal(summary.overStockCount, 1);

  const charlie = rows.find((r) => r.sku === 'C');
  assert.equal(charlie.categoryName, 'Chưa phân loại');
  assert.equal(charlie.warehouseCode, 'HCM');
});

test('buildInventoryReport - bộ lọc kho / danh mục / trạng thái / từ khóa', () => {
  const run = (filters) => buildInventoryReport(INVENTORIES, PRODUCTS, CATEGORIES, WAREHOUSES, filters);
  assert.equal(run({ warehouseId: '10' }).rows.length, 2);
  assert.equal(run({ categoryId: '200' }).rows.length, 1);
  assert.equal(run({ status: 'OUT_OF_STOCK' }).rows.length, 1);
  assert.equal(run({ search: 'alp' }).rows.length, 2);
  // Tổng hợp luôn khớp với các dòng đã lọc
  const filtered = run({ warehouseId: '10' });
  assert.equal(filtered.summary.totalQuantity, 65);
  assert.equal(filtered.summary.rowCount, filtered.rows.length);
});

test('Báo cáo tồn kho và KPI dashboard khớp tổng tồn / giá trị trên cùng dữ liệu', () => {
  const kpis = calculateKpis(PRODUCTS, INVENTORIES, WAREHOUSES);
  const { summary } = buildInventoryReport(INVENTORIES, PRODUCTS, CATEGORIES, WAREHOUSES);
  assert.equal(summary.totalQuantity, kpis.totalStockQuantity);
  assert.equal(summary.totalReserved, kpis.totalReservedQuantity);
  assert.equal(summary.totalAvailable, kpis.totalAvailableQuantity);
  assert.equal(summary.totalValue, kpis.totalInventoryValue);
});

// ───────── Xác thực contract backend ─────────

test('isValidKpis / isValidTransactionReport / isValidInventoryReport', () => {
  assert.equal(isValidKpis({ totalProducts: 3, totalStockQuantity: 10, lowStockCount: 1, outOfStockCount: 0 }), true);
  assert.equal(isValidKpis({ totalProducts: 3 }), false);
  assert.equal(isValidKpis({ totalProducts: 'x', totalStockQuantity: 1, lowStockCount: 0, outOfStockCount: 0 }), false);
  assert.equal(isValidKpis(null), false);
  assert.equal(isValidKpis([]), false);

  assert.equal(isValidTransactionReport({ summary: {}, rows: [] }), true);
  assert.equal(isValidTransactionReport({ rows: [] }), false);
  assert.equal(isValidInventoryReport({ summary: {}, rows: 'no' }), false);
});

// ───────── CSV ─────────

test('toCsv - escape dấu phẩy / nháy kép / xuống dòng và chặn formula injection', () => {
  const cols = [{ key: 'a', header: 'Tên' }, { key: 'b', header: 'Ghi chú' }];
  const csv = toCsv(cols, [
    { a: 'Hộp, nhỏ', b: 'Nói "ok"' },
    { a: 'dòng 1\ndòng 2', b: '=HYPERLINK("x")' },
    { a: -5, b: null },
  ]);
  const lines = csv.split('\r\n');
  assert.equal(lines[0], 'Tên,Ghi chú');
  assert.equal(lines[1], '"Hộp, nhỏ","Nói ""ok"""');
  assert.ok(csv.includes('"dòng 1\ndòng 2"'));
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`), 'ô bắt đầu bằng = bị vô hiệu hóa');
  assert.equal(lines[lines.length - 1], '-5,', 'số âm không bị coi là formula');
});

test('toCsv - xuất báo cáo tồn kho đủ cột, tiêu đề tiếng Việt và trạng thái dịch nghĩa', () => {
  const { rows } = buildInventoryReport(INVENTORIES, PRODUCTS, CATEGORIES, WAREHOUSES);
  const lines = toCsv(INVENTORY_CSV_COLUMNS, rows).split('\r\n');
  assert.equal(lines.length, rows.length + 1);
  assert.ok(lines[0].startsWith('SKU,Sản phẩm,Danh mục'));
  assert.ok(lines.some((l) => l.endsWith('Hết hàng')));
  assert.ok(lines.some((l) => l.endsWith('Vượt định mức')));
});
