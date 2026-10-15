import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReceiving, validateIssuing, filterTransactions } from './stockMovement.js';

test('validateReceiving - kiểm tra tính hợp lệ của phiếu nhập kho', () => {
  // Thiếu thông tin bắt buộc
  const errEmpty = validateReceiving({ productId: '', warehouseId: '', quantity: '' });
  assert.equal(errEmpty.productId, 'Vui lòng chọn sản phẩm nhập kho');
  assert.equal(errEmpty.warehouseId, 'Vui lòng chọn kho nhận hàng');
  assert.equal(errEmpty.quantity, 'Số lượng nhập phải là số nguyên dương (> 0)');

  // Số lượng không hợp lệ (âm hoặc bằng 0 hoặc số thực)
  assert.ok(validateReceiving({ productId: 1, warehouseId: 1, quantity: 0 }).quantity);
  assert.ok(validateReceiving({ productId: 1, warehouseId: 1, quantity: -5 }).quantity);
  assert.ok(validateReceiving({ productId: 1, warehouseId: 1, quantity: 2.5 }).quantity);

  // Hợp lệ
  const valid = validateReceiving({
    productId: 1,
    warehouseId: 2,
    quantity: 10,
    referenceDoc: 'PO-2026-001',
    reason: 'Nhập từ NCC',
  });
  assert.deepEqual(valid, {});
});

test('validateIssuing - kiểm tra tính hợp lệ và chống xuất vượt tồn', () => {
  // Thiếu thông tin
  const errEmpty = validateIssuing({ productId: '', warehouseId: '', quantity: '' });
  assert.equal(errEmpty.productId, 'Vui lòng chọn sản phẩm xuất kho');
  assert.equal(errEmpty.warehouseId, 'Vui lòng chọn kho xuất hàng');

  // Xuất vượt tồn khả dụng
  const errOver = validateIssuing({
    productId: 1,
    warehouseId: 1,
    quantity: 15,
    availableStock: 10,
  });
  assert.match(errOver.quantity, /vượt quá tồn khả dụng/);

  // Xuất hợp lệ đúng bằng tồn khả dụng
  const validExact = validateIssuing({
    productId: 1,
    warehouseId: 1,
    quantity: 10,
    availableStock: 10,
  });
  assert.deepEqual(validExact, {});
});

test('filterTransactions - lọc danh sách giao dịch theo tiêu chí', () => {
  const transactions = [
    { id: 1, transactionCode: 'TXN-001', transactionType: 'RECEIVING', productId: 10, sourceWarehouseId: null, destinationWarehouseId: 1, referenceDoc: 'PO-01' },
    { id: 2, transactionCode: 'TXN-002', transactionType: 'ISSUING', productId: 10, sourceWarehouseId: 1, destinationWarehouseId: null, referenceDoc: 'SO-02' },
    { id: 3, transactionCode: 'TXN-003', transactionType: 'TRANSFER_IN', productId: 20, sourceWarehouseId: 1, destinationWarehouseId: 2, referenceDoc: 'TR-03' },
  ];

  // Lọc theo type
  const receivingOnly = filterTransactions(transactions, { type: 'RECEIVING' });
  assert.equal(receivingOnly.length, 1);
  assert.equal(receivingOnly[0].transactionCode, 'TXN-001');

  // Lọc theo warehouse
  const wh2 = filterTransactions(transactions, { warehouseId: 2 });
  assert.equal(wh2.length, 1);
  assert.equal(wh2[0].transactionCode, 'TXN-003');

  // Tìm kiếm theo từ khóa
  const searchSO = filterTransactions(transactions, { search: 'SO-02' });
  assert.equal(searchSO.length, 1);
  assert.equal(searchSO[0].transactionCode, 'TXN-002');
});
