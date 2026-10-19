import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyStock,
  getAvailableStock,
  getCurrentStock,
  buildStockAlerts,
  summarizeAlerts,
  filterAlerts,
  normalizeBackendAlert,
  normalizeBackendAlerts,
} from './stockAlerts.js';
import { calculateKpis } from './dashboard.js';
import { isEndpointMissing, cleanParams } from './apiFallback.js';

// ───────── Sprint6-04 / 06-16: các mức cảnh báo ─────────

test('classifyStock - ranh giới Out of Stock / Low Stock / OK', () => {
  assert.equal(classifyStock(0, 10), 'OUT_OF_STOCK');
  assert.equal(classifyStock(-3, 10), 'OUT_OF_STOCK');
  assert.equal(classifyStock(1, 10), 'LOW_STOCK');
  assert.equal(classifyStock(10, 10), 'LOW_STOCK', 'bằng ngưỡng tối thiểu vẫn là Low Stock');
  assert.equal(classifyStock(11, 10), 'OK');
  assert.equal(classifyStock(5, 0), 'OK', 'không đặt ngưỡng tối thiểu thì không cảnh báo Low Stock');
  assert.equal(classifyStock(0, 0), 'OUT_OF_STOCK', 'hết hàng luôn cảnh báo dù không có ngưỡng');
  assert.equal(classifyStock(undefined, undefined), 'OUT_OF_STOCK');
});

test('getCurrentStock / getAvailableStock - đọc currentStock của backend và không bao giờ âm', () => {
  assert.equal(getCurrentStock({ currentStock: 40 }), 40);
  assert.equal(getCurrentStock({ quantity: 25 }), 25, 'tương thích dữ liệu cũ dùng quantity');
  assert.equal(getCurrentStock({ currentStock: 0, quantity: 99 }), 0, 'currentStock = 0 không bị rơi sang quantity');
  assert.equal(getAvailableStock({ currentStock: 40, reservedStock: 15 }), 25);
  assert.equal(getAvailableStock({ currentStock: 10, reservedStock: 30 }), 0);
  assert.equal(getAvailableStock({ currentStock: 40, reservedStock: 15, availableStock: 7 }), 7, 'ưu tiên availableStock backend');
  assert.equal(getAvailableStock(null), 0);
});

const PRODUCTS = [
  { id: 1, sku: 'A', name: 'Alpha', minStockLevel: 10 },
  { id: 2, sku: 'B', name: 'Bravo', minStockLevel: 20 },
  { id: 3, sku: 'C', name: 'Charlie', minStockLevel: 5 },
  { id: 4, sku: 'D', name: 'Delta', minStockLevel: 10 },
  { id: 5, sku: 'E', name: 'Echo (ngừng bán)', minStockLevel: 10, status: 'INACTIVE' },
];
const WAREHOUSES = [
  { id: 10, code: 'HN', name: 'Kho Hà Nội' },
  { id: 20, code: 'HCM', name: 'Kho HCM' },
];

test('buildStockAlerts - gộp nhiều kho, phân loại, bỏ sản phẩm ngừng hoạt động, sắp xếp mức độ', () => {
  const inventories = [
    { productId: 1, warehouseId: 10, currentStock: 6, reservedStock: 0 },
    { productId: 1, warehouseId: 20, currentStock: 5, reservedStock: 0 }, // tổng 11 > 10 → OK
    { productId: 2, warehouseId: 10, currentStock: 15, reservedStock: 0 }, // 15 <= 20 → LOW (thiếu 5)
    { productId: 4, warehouseId: 10, currentStock: 30, reservedStock: 30 }, // khả dụng 0 → OUT
    { productId: 5, warehouseId: 10, currentStock: 0, reservedStock: 0 }, // INACTIVE → bỏ qua
    // sản phẩm 3 không có dòng tồn → OUT
  ];

  const alerts = buildStockAlerts(PRODUCTS, inventories, WAREHOUSES);

  assert.deepEqual(
    alerts.map((a) => [a.product.id, a.type]),
    [
      [4, 'OUT_OF_STOCK'], // OUT trước; Delta thiếu hụt 10 → đứng trước Charlie (thiếu 5)
      [3, 'OUT_OF_STOCK'],
      [2, 'LOW_STOCK'],
    ]
  );
  assert.ok(!alerts.some((a) => a.product.id === 1), 'Alpha tổng 11 > 10 nên không cảnh báo');
  assert.ok(!alerts.some((a) => a.product.id === 5), 'sản phẩm INACTIVE không cảnh báo');

  const bravo = alerts.find((a) => a.product.id === 2);
  assert.equal(bravo.available, 15);
  assert.equal(bravo.minStock, 20);
  assert.equal(bravo.shortage, 5);
  assert.deepEqual(bravo.warehouses, [{ warehouseId: 10, code: 'HN', name: 'Kho Hà Nội', available: 15 }]);

  const charlie = alerts.find((a) => a.product.id === 3);
  assert.deepEqual(charlie.warehouses, [], 'chưa có dòng tồn nào');
  assert.equal(charlie.priority, 'high');
});

test('summarizeAlerts & filterAlerts', () => {
  // Chỉ Bravo có tồn (15 <= 20 → Low). Alpha, Charlie, Delta không có dòng tồn → Out. Echo INACTIVE → bỏ.
  const alerts = buildStockAlerts(PRODUCTS, [{ productId: 2, warehouseId: 10, currentStock: 15 }], WAREHOUSES);
  assert.deepEqual(summarizeAlerts(alerts), { total: 4, outOfStock: 3, lowStock: 1 });

  assert.equal(filterAlerts(alerts, { type: 'LOW_STOCK' }).length, 1);
  assert.equal(filterAlerts(alerts, { type: 'OUT_OF_STOCK' }).length, 3);
  assert.equal(filterAlerts(alerts, { search: 'brav' }).length, 1, 'tìm theo tên không phân biệt hoa thường');
  assert.equal(filterAlerts(alerts, { search: 'D', type: 'OUT_OF_STOCK' }).length, 1, 'tìm theo SKU + lọc loại');
  assert.equal(filterAlerts(alerts, { search: 'zzz' }).length, 0);
});

test('KPI và danh sách cảnh báo luôn khớp số liệu (cùng định nghĩa Low / Out of Stock)', () => {
  const inventories = [
    { productId: 1, warehouseId: 10, currentStock: 6, reservedStock: 2 },
    { productId: 2, warehouseId: 10, currentStock: 15, reservedStock: 0 },
    { productId: 4, warehouseId: 10, currentStock: 30, reservedStock: 30 },
  ];
  const kpis = calculateKpis(PRODUCTS, inventories, WAREHOUSES);
  const summary = summarizeAlerts(buildStockAlerts(PRODUCTS, inventories, WAREHOUSES));
  assert.equal(kpis.outOfStockCount, summary.outOfStock);
  assert.equal(kpis.lowStockCount, summary.lowStock);
});

test('calculateKpis - đọc currentStock của backend (không còn ra 0 với dữ liệu thật)', () => {
  const kpis = calculateKpis(
    [{ id: 1, minStockLevel: 5, purchasePrice: 1000 }],
    [{ productId: 1, warehouseId: 10, currentStock: 40, reservedStock: 10, availableStock: 30 }],
    [{ id: 10, status: 'ACTIVE' }]
  );
  assert.equal(kpis.totalStockQuantity, 40);
  assert.equal(kpis.totalReservedQuantity, 10);
  assert.equal(kpis.totalAvailableQuantity, 30);
  assert.equal(kpis.totalInventoryValue, 40000);
});

// ───────── Contract Alert API (Sprint6-03) ─────────

test('normalizeBackendAlert - nhận dạng phẳng, từ chối loại không hợp lệ', () => {
  const a = normalizeBackendAlert({
    productId: 7, productSku: 'SKU7', productName: 'Seven', alertType: 'LOW_STOCK',
    currentStock: 4, minStockLevel: 10,
  });
  assert.equal(a.type, 'LOW_STOCK');
  assert.equal(a.product.name, 'Seven');
  assert.equal(a.available, 4);
  assert.equal(a.shortage, 6);
  assert.equal(normalizeBackendAlert({ type: 'OVER_STOCK' }), null);
  assert.equal(normalizeBackendAlert(null), null);
});

test('normalizeBackendAlerts - sai kiểu trả về null để hook fallback; có dữ liệu thì sắp xếp', () => {
  assert.equal(normalizeBackendAlerts({ not: 'an array' }), null);
  assert.equal(normalizeBackendAlerts(undefined), null);
  const list = normalizeBackendAlerts([
    { productId: 1, productName: 'L', type: 'LOW_STOCK', availableStock: 2, minStockLevel: 5 },
    { productId: 2, productName: 'O', type: 'OUT_OF_STOCK', availableStock: 0, minStockLevel: 5 },
    { bogus: true },
  ]);
  assert.deepEqual(list.map((a) => a.type), ['OUT_OF_STOCK', 'LOW_STOCK']);
});

// ───────── Quy tắc fallback API (Sprint6-15) ─────────

test('isEndpointMissing - chỉ 404/405/501 mới được fallback', () => {
  assert.equal(isEndpointMissing({ status: 404 }), true);
  assert.equal(isEndpointMissing({ status: 405 }), true);
  assert.equal(isEndpointMissing({ status: 501 }), true);
  assert.equal(isEndpointMissing({ status: 401 }), false);
  assert.equal(isEndpointMissing({ status: 403 }), false);
  assert.equal(isEndpointMissing({ status: 500 }), false);
  assert.equal(isEndpointMissing({ code: 'NETWORK_ERROR', status: null }), false);
  assert.equal(isEndpointMissing(undefined), false);
});

test('cleanParams - bỏ giá trị rỗng và "all"', () => {
  assert.deepEqual(cleanParams({ a: 'all', b: '', c: null, d: undefined, e: 0, f: 'x' }), { e: 0, f: 'x' });
});
