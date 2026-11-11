import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addNotification,
  applyInventoryUpdate,
  buildSocketUrl,
  markAllRead,
  nextDelay,
  parseMessage,
  toNotification,
  unreadCount,
} from './inventoryRealtime.js';

test('buildSocketUrl - chọn ws/wss theo giao thức và mã hóa token', () => {
  assert.equal(
    buildSocketUrl('a b', { location: { protocol: 'http:', host: 'localhost:5173' } }),
    'ws://localhost:5173/ws/inventory?token=a%20b'
  );
  assert.equal(
    buildSocketUrl('t', { location: { protocol: 'https:', host: 'x.vn' } }),
    'wss://x.vn/ws/inventory?token=t'
  );
  assert.equal(buildSocketUrl('t', { override: 'ws://h:1/ws/inventory' }), 'ws://h:1/ws/inventory?token=t');
});

test('nextDelay - tăng gấp đôi, tối đa 30s, nhiễu không quá 20%', () => {
  assert.equal(nextDelay(0, () => 0), 1000);
  assert.equal(nextDelay(1, () => 0), 2000);
  assert.equal(nextDelay(3, () => 0), 8000);
  assert.equal(nextDelay(20, () => 0), 30000);
  assert.equal(nextDelay(0, () => 1), 1200);
  assert.equal(nextDelay(-5, () => 0), 1000);
});

test('parseMessage - JSON hợp lệ có type, còn lại là null', () => {
  assert.deepEqual(parseMessage('{"type":"PONG"}'), { type: 'PONG', data: null });
  assert.equal(parseMessage('không phải json'), null);
  assert.equal(parseMessage('{"data":1}'), null);
  assert.equal(parseMessage('null'), null);
});

const rows = [
  { id: 1, currentStock: 50, reservedStock: 0, availableStock: 50, stockStatus: 'IN_STOCK', productSku: 'A' },
  { id: 2, currentStock: 9, reservedStock: 0, availableStock: 9, stockStatus: 'LOW_STOCK', productSku: 'B' },
];
const update = { inventoryId: 1, currentStock: 8, reservedStock: 2, availableStock: 6, stockStatus: 'LOW_STOCK', occurredAt: '2026-11-06T10:00:00Z' };

test('applyInventoryUpdate - cập nhật đúng dòng, không đổi dòng khác và không sửa mảng cũ', () => {
  const { rows: next, found } = applyInventoryUpdate(rows, update);
  assert.equal(found, true);
  assert.equal(next[0].currentStock, 8);
  assert.equal(next[0].stockStatus, 'LOW_STOCK');
  assert.equal(next[0].productSku, 'A');
  assert.equal(next[1], rows[1]);
  assert.equal(rows[0].currentStock, 50);
});

test('applyInventoryUpdate - bản ghi lạ: found=false, giữ nguyên danh sách', () => {
  const r = applyInventoryUpdate(rows, { ...update, inventoryId: 99 });
  assert.equal(r.found, false);
  assert.equal(r.rows, rows);
  assert.equal(applyInventoryUpdate(null, update).found, false);
});

test('toNotification - chỉ STOCK_ALERT, hết hàng là error, sắp hết là warning', () => {
  const base = { productName: 'Chuột', productSku: 'M1', warehouseName: 'Kho A', inventoryId: 3, occurredAt: 't1' };
  const low = toNotification({ type: 'STOCK_ALERT', data: { ...base, stockStatus: 'LOW_STOCK', currentStock: 5 } });
  const out = toNotification({ type: 'STOCK_ALERT', data: { ...base, stockStatus: 'OUT_OF_STOCK', currentStock: 0 } });
  assert.equal(low.level, 'warning');
  assert.match(low.text, /Chuột \(M1\) tại Kho A sắp hết hàng: còn 5/);
  assert.equal(out.level, 'error');
  assert.equal(out.title, 'Hết hàng');
  assert.equal(toNotification({ type: 'INVENTORY_UPDATED', data: base }), null);
  assert.equal(toNotification(null), null);
});

test('addNotification - mới nhất lên đầu, không trùng, giới hạn số lượng', () => {
  let list = [];
  list = addNotification(list, { id: 'a', read: false });
  list = addNotification(list, { id: 'b', read: false });
  list = addNotification(list, { id: 'a', read: false });
  assert.deepEqual(list.map((n) => n.id), ['b', 'a']);
  list = addNotification(list, { id: 'c', read: false }, 2);
  assert.deepEqual(list.map((n) => n.id), ['c', 'b']);
  assert.equal(addNotification(list, null), list);
});

test('markAllRead / unreadCount', () => {
  const list = [{ id: 1, read: false }, { id: 2, read: true }, { id: 3, read: false }];
  assert.equal(unreadCount(list), 2);
  assert.equal(unreadCount(markAllRead(list)), 0);
});

test('toNotification - PO_UPDATED tạo thông báo theo trạng thái, DRAFT thì bỏ qua', () => {
  const base = { poId: 5, poNumber: 'PO-1', occurredAt: '2026-11-06T10:00:00Z' };
  const received = toNotification({ type: 'PO_UPDATED', data: { ...base, status: 'RECEIVED' } });
  assert.equal(received.text, 'Đơn PO-1 đã nhận đủ hàng.');
  assert.equal(received.level, 'info');
  assert.equal(toNotification({ type: 'PO_UPDATED', data: { ...base, status: 'CANCELLED' } }).level, 'warning');
  assert.equal(toNotification({ type: 'PO_UPDATED', data: { ...base, status: 'DRAFT' } }), null);
});
