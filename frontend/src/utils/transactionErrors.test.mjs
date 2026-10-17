import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapTransactionError, toFormErrors, parseFieldDetails } from './transactionErrors.js';

test('INSUFFICIENT_STOCK: giữ nguyên message server, gắn vào ô quantity, nên tải lại', () => {
  const info = mapTransactionError({ code: 'INSUFFICIENT_STOCK', status: 400, message: 'Không đủ tồn... khả dụng: 5' });
  assert.equal(info.field, 'quantity');
  assert.equal(info.message, 'Không đủ tồn... khả dụng: 5');
  assert.equal(info.reload, true);
  assert.deepEqual(toFormErrors(info), { quantity: 'Không đủ tồn... khả dụng: 5' });
});

test('SAME_WAREHOUSE_TRANSFER: message tiếng Việt cố định, gắn vào kho đích', () => {
  const info = mapTransactionError({ code: 'SAME_WAREHOUSE_TRANSFER', status: 400, message: 'english from server' });
  assert.equal(info.field, 'destinationWarehouseId');
  assert.match(info.message, /không được trùng/);
});

test('VALIDATION_ERROR: tách details thành lỗi từng ô', () => {
  const info = mapTransactionError({
    code: 'VALIDATION_ERROR', status: 400, message: 'One or more fields are invalid.',
    details: ['quantity: Số lượng chuyển kho phải lớn hơn 0', 'destinationWarehouseId: không được để trống'],
  });
  assert.deepEqual(info.fieldErrors, {
    quantity: 'Số lượng chuyển kho phải lớn hơn 0',
    destinationWarehouseId: 'không được để trống',
  });
  assert.deepEqual(toFormErrors(info), info.fieldErrors);
});

test('VALIDATION_ERROR không có details: rơi về lỗi chung', () => {
  const info = mapTransactionError({ code: 'VALIDATION_ERROR', status: 400, message: 'bad', details: null });
  assert.deepEqual(toFormErrors(info), { general: 'bad' });
});

test('parseFieldDetails bỏ qua chuỗi không đúng định dạng và không ghi đè lỗi đầu tiên', () => {
  assert.deepEqual(parseFieldDetails(['abc', 'a: x', 'a: y']), { a: 'x' });
  assert.deepEqual(parseFieldDetails(null), {});
});

test('NETWORK_ERROR: có thể thử lại', () => {
  const info = mapTransactionError({ code: 'NETWORK_ERROR', message: 'Unable to reach' });
  assert.equal(info.retryable, true);
  assert.match(info.message, /Không kết nối được máy chủ/);
});

test('TRANSACTION_CONFLICT (khoá / deadlock): thử lại và tải lại', () => {
  const info = mapTransactionError({ code: 'TRANSACTION_CONFLICT', status: 409, message: 'x' });
  assert.equal(info.retryable, true);
  assert.equal(info.reload, true);
});

test('401 không rõ code: yêu cầu đăng nhập lại', () => {
  const info = mapTransactionError({ code: 'UNKNOWN_ERROR', status: 401, message: 'x' });
  assert.equal(info.relogin, true);
});

test('403: báo không đủ quyền', () => {
  assert.match(mapTransactionError({ code: 'UNKNOWN_ERROR', status: 403 }).message, /không có quyền/);
});

test('5xx không rõ code: lỗi hệ thống, có thể thử lại', () => {
  const info = mapTransactionError({ code: 'UNKNOWN_ERROR', status: 503, message: 'x' });
  assert.equal(info.retryable, true);
  assert.equal(info.code, 'INTERNAL_ERROR');
});

test('INVENTORY_NOT_FOUND: yêu cầu tải lại dữ liệu', () => {
  const info = mapTransactionError({ code: 'INVENTORY_NOT_FOUND', status: 404, message: 'x' });
  assert.equal(info.reload, true);
});

test('Mã lạ: dùng nguyên message của server', () => {
  const info = mapTransactionError({ code: 'SOMETHING_NEW', status: 400, message: 'Thông báo từ server' });
  assert.equal(info.message, 'Thông báo từ server');
  assert.deepEqual(toFormErrors(info), { general: 'Thông báo từ server' });
});

test('Không truyền gì: không ném lỗi', () => {
  const info = mapTransactionError(undefined);
  assert.equal(info.code, 'UNKNOWN_ERROR');
  assert.ok(info.message);
});
