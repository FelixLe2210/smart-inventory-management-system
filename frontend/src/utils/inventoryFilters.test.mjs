import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize, filterInventory, validateAdjustment } from './inventoryFilters.js';

const rows = [
  { id: 1, productSku: 'SP-A', productName: 'Chuột', warehouseCode: 'KHO-1', warehouseName: 'Kho HCM', locationInWarehouse: 'A1', stockStatus: 'IN_STOCK', currentStock: 50 },
  { id: 2, productSku: 'SP-B', productName: 'Bàn phím', warehouseCode: 'KHO-1', warehouseName: 'Kho HCM', locationInWarehouse: null, stockStatus: 'LOW_STOCK', currentStock: 5 },
  { id: 3, productSku: 'SP-C', productName: 'Màn hình', warehouseCode: 'KHO-2', warehouseName: 'Kho HN', locationInWarehouse: 'B2', stockStatus: 'OUT_OF_STOCK', currentStock: 0 },
  { id: 4, productSku: 'SP-D', productName: 'Tai nghe', warehouseCode: 'KHO-2', warehouseName: 'Kho HN', locationInWarehouse: 'B3', stockStatus: 'OVER_STOCK', currentStock: 300 },
];

test('summarize đếm đúng từng trạng thái và tổng số lượng', () => {
  assert.deepEqual(summarize(rows), { totalItems: 4, inStock: 1, lowStock: 1, outOfStock: 1, overStock: 1, totalUnits: 355 });
  assert.deepEqual(summarize([]), { totalItems: 0, inStock: 0, lowStock: 0, outOfStock: 0, overStock: 0, totalUnits: 0 });
});

test('filterInventory theo trạng thái', () => {
  assert.equal(filterInventory(rows, 'all', '').length, 4);
  assert.deepEqual(filterInventory(rows, 'LOW_STOCK').map((r) => r.id), [2]);
  assert.deepEqual(filterInventory(rows, 'OUT_OF_STOCK').map((r) => r.id), [3]);
  assert.deepEqual(filterInventory(rows, 'OVER_STOCK').map((r) => r.id), [4]);
});

test('filterInventory theo từ khóa: SKU, tên, kho, vị trí, không phân biệt hoa/thường', () => {
  assert.deepEqual(filterInventory(rows, 'all', 'sp-a').map((r) => r.id), [1]);
  assert.deepEqual(filterInventory(rows, 'all', 'kho hn').map((r) => r.id), [3, 4]);
  assert.deepEqual(filterInventory(rows, 'all', 'b2').map((r) => r.id), [3]);
  assert.deepEqual(filterInventory(rows, 'all', '  ').length, 4);
  assert.equal(filterInventory(rows, 'all', 'không có').length, 0);
});

test('filterInventory kết hợp trạng thái + từ khóa', () => {
  assert.deepEqual(filterInventory(rows, 'LOW_STOCK', 'kho-1').map((r) => r.id), [2]);
  assert.equal(filterInventory(rows, 'LOW_STOCK', 'kho-2').length, 0);
});

const item = { currentStock: 50, reservedStock: 20, availableStock: 30 };

test('validateAdjustment: số lượng hợp lệ / không hợp lệ', () => {
  assert.equal(validateAdjustment(item, 'IN', '10'), null);
  assert.ok(validateAdjustment(item, 'IN', ''));
  assert.ok(validateAdjustment(item, 'IN', '-1'));
  assert.ok(validateAdjustment(item, 'IN', '1.5'));
  assert.ok(validateAdjustment(item, 'IN', '0'));       // IN phải > 0
  assert.equal(validateAdjustment(item, 'SET', '20'), null); // SET cho phép = giữ chỗ
});

test('validateAdjustment: OUT/RESERVE không vượt khả dụng, RELEASE không vượt giữ chỗ, SET không dưới giữ chỗ', () => {
  assert.equal(validateAdjustment(item, 'OUT', '30'), null);
  assert.ok(validateAdjustment(item, 'OUT', '31'));
  assert.ok(validateAdjustment(item, 'RESERVE', '31'));
  assert.equal(validateAdjustment(item, 'RELEASE', '20'), null);
  assert.ok(validateAdjustment(item, 'RELEASE', '21'));
  assert.ok(validateAdjustment(item, 'SET', '19'));
});
