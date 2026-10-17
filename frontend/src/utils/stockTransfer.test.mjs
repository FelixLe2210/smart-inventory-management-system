import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTransfer, getSourceOptions, getDestinationOptions, getTransferableProducts,
  previewTransfer, verifyTransferResult,
} from './stockTransfer.js';

const ok = { productId: 1, sourceWarehouseId: 10, destinationWarehouseId: 20, quantity: 5, availableStock: 8 };

test('validateTransfer: hợp lệ thì không có lỗi', () => {
  assert.deepEqual(validateTransfer(ok), {});
});

test('validateTransfer: thiếu sản phẩm / kho nguồn / kho đích', () => {
  const e = validateTransfer({ quantity: 1 });
  assert.ok(e.productId && e.sourceWarehouseId && e.destinationWarehouseId);
});

test('validateTransfer: kho đích trùng kho nguồn', () => {
  const e = validateTransfer({ ...ok, destinationWarehouseId: 10 });
  assert.match(e.destinationWarehouseId, /khác kho nguồn/);
});

test('validateTransfer: số lượng 0, âm, thập phân, rỗng đều bị từ chối', () => {
  for (const q of [0, -3, 2.5, '', 'abc', null]) {
    assert.ok(validateTransfer({ ...ok, quantity: q }).quantity, `quantity=${q}`);
  }
});

test('validateTransfer: vượt tồn khả dụng; bằng đúng khả dụng thì được', () => {
  assert.match(validateTransfer({ ...ok, quantity: 9 }).quantity, /vượt quá tồn khả dụng/);
  assert.equal(validateTransfer({ ...ok, quantity: 8 }).quantity, undefined);
});

test('validateTransfer: giới hạn độ dài chứng từ và lý do', () => {
  const e = validateTransfer({ ...ok, referenceDoc: 'x'.repeat(51), reason: 'y'.repeat(256) });
  assert.ok(e.referenceDoc && e.reason);
});

const invs = [
  { id: 1, productId: 1, warehouseId: 10, currentStock: 50, availableStock: 40 },
  { id: 2, productId: 1, warehouseId: 11, currentStock: 5, availableStock: 0 },
  { id: 3, productId: 1, warehouseId: 12, currentStock: 90, availableStock: 90 },
  { id: 4, productId: 2, warehouseId: 10, currentStock: 7, availableStock: 7 },
];

test('getSourceOptions: đúng sản phẩm, còn khả dụng, nhiều hàng nhất trước', () => {
  assert.deepEqual(getSourceOptions(invs, 1).map((i) => i.id), [3, 1]);
  assert.deepEqual(getSourceOptions(invs, null), []);
});

test('getDestinationOptions: chỉ kho ACTIVE và khác kho nguồn', () => {
  const whs = [
    { id: 10, status: 'ACTIVE' }, { id: 11, status: 'MAINTENANCE' },
    { id: 12, status: 'ACTIVE' }, { id: 13, status: 'INACTIVE' },
  ];
  assert.deepEqual(getDestinationOptions(whs, 10).map((w) => w.id), [12]);
  assert.deepEqual(getDestinationOptions(whs).map((w) => w.id), [10, 12]);
});

test('getTransferableProducts: bỏ sản phẩm INACTIVE hoặc không còn khả dụng', () => {
  const products = [
    { id: 1, status: 'ACTIVE' }, { id: 2, status: 'INACTIVE' }, { id: 3, status: 'ACTIVE' },
  ];
  assert.deepEqual(getTransferableProducts(products, invs).map((p) => p.id), [1]);
});

test('previewTransfer: kho đích đã có dòng tồn', () => {
  const p = previewTransfer({ sourceInventory: invs[0], destinationInventory: invs[2], quantity: 10 });
  assert.deepEqual(p, {
    quantity: 10, sourceBefore: 50, sourceAfter: 40, destinationBefore: 90, destinationAfter: 100, destinationIsNew: false,
  });
});

test('previewTransfer: kho đích chưa có dòng tồn -> đánh dấu tạo mới, tồn đầu = 0', () => {
  const p = previewTransfer({ sourceInventory: invs[0], destinationInventory: null, quantity: 5 });
  assert.equal(p.destinationIsNew, true);
  assert.equal(p.destinationBefore, 0);
  assert.equal(p.destinationAfter, 5);
});

test('verifyTransferResult: khớp thì ok', () => {
  assert.deepEqual(
    verifyTransferResult({ sourceBefore: 50, destinationBefore: 90, sourceAfter: 40, destinationAfter: 100, quantity: 10 }),
    { ok: true, problems: [] }
  );
});

test('verifyTransferResult: phát hiện lệch ở kho nguồn, kho đích và tổng', () => {
  const r = verifyTransferResult({ sourceBefore: 50, destinationBefore: 90, sourceAfter: 45, destinationAfter: 100, quantity: 10 });
  assert.equal(r.ok, false);
  assert.equal(r.problems.length, 2); // nguồn sai + tổng đổi
  const r2 = verifyTransferResult({ sourceBefore: 50, destinationBefore: 0, sourceAfter: 40, destinationAfter: 0, quantity: 10 });
  assert.equal(r2.ok, false);
  assert.equal(r2.problems.length, 2); // đích sai + tổng đổi
});

test('getSourceOptions: truyền danh sách kho thì loại kho không ACTIVE (backend từ chối kho nguồn bảo trì)', () => {
  const whs = [{ id: 10, status: 'MAINTENANCE' }, { id: 11, status: 'ACTIVE' }, { id: 12, status: 'ACTIVE' }];
  assert.deepEqual(getSourceOptions(invs, 1, whs).map((i) => i.id), [3]); // kho 10 bảo trì, kho 11 hết khả dụng
  assert.deepEqual(getSourceOptions(invs, 1).map((i) => i.id), [3, 1]); // không truyền kho: không lọc
});

test('getTransferableProducts: hàng chỉ nằm ở kho không ACTIVE thì không thể chuyển', () => {
  const products = [{ id: 1, status: 'ACTIVE' }, { id: 2, status: 'ACTIVE' }];
  const whs = [{ id: 10, status: 'MAINTENANCE' }, { id: 12, status: 'ACTIVE' }];
  // SP 2 chỉ có hàng ở kho 10 (bảo trì); SP 1 còn hàng ở kho 12 (ACTIVE)
  assert.deepEqual(getTransferableProducts(products, invs, whs).map((p) => p.id), [1]);
});
