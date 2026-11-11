import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPoPayload,
  buildReceiveLines,
  formatProbability,
  isPlaceholderForecast,
  poActions,
  poProgress,
  poToForm,
  sortRecommendations,
  summarizeRecommendations,
  todayIso,
  urgencyConfig,
  validatePoForm,
} from './reorder.js';

test('sortRecommendations - khẩn cấp trước, rồi xác suất thiếu hàng, không đổi mảng gốc', () => {
  const input = [
    { id: 1, urgencyLevel: 'LOW', stockoutProbability: 0.9 },
    { id: 2, urgencyLevel: 'CRITICAL', stockoutProbability: 0.5 },
    { id: 3, urgencyLevel: 'HIGH', stockoutProbability: 0.3 },
    { id: 4, urgencyLevel: 'HIGH', stockoutProbability: 0.8 },
  ];
  assert.deepEqual(sortRecommendations(input).map((r) => r.id), [2, 4, 3, 1]);
  assert.deepEqual(input.map((r) => r.id), [1, 2, 3, 4]);
});

test('summarizeRecommendations - chỉ đếm đề xuất đang chờ xử lý', () => {
  const s = summarizeRecommendations([
    { status: 'PENDING', urgencyLevel: 'CRITICAL', action: 'REORDER' },
    { status: 'PENDING', urgencyLevel: 'HIGH', action: 'EXPEDITE_INCOMING' },
    { status: 'ACCEPTED', urgencyLevel: 'CRITICAL', action: 'REORDER' },
  ]);
  assert.deepEqual(s, { total: 3, pending: 2, critical: 1, high: 1, expedite: 1 });
});

test('urgencyConfig - giá trị lạ rơi về LOW', () => {
  assert.equal(urgencyConfig('???').label, 'Thấp');
  assert.equal(urgencyConfig('CRITICAL').rank, 3);
});

test('formatProbability - làm tròn và chặn 0..1', () => {
  assert.equal(formatProbability(0.9123), '91%');
  assert.equal(formatProbability(1.7), '100%');
  assert.equal(formatProbability(-1), '0%');
  assert.equal(formatProbability(undefined), '—');
});

test('isPlaceholderForecast - nhận biết dự báo thiếu lịch sử bán', () => {
  assert.equal(isPlaceholderForecast({ details: { history_source: 'short_history' } }), true);
  assert.equal(isPlaceholderForecast({ details: { history_source: 'insufficient_history' } }), true);
  assert.equal(isPlaceholderForecast({ details: { history_source: 'provided' } }), false);
  assert.equal(isPlaceholderForecast({}), false);
});

test('poActions - quy tắc theo trạng thái khớp backend', () => {
  assert.deepEqual(poActions('DRAFT'), { canEdit: true, canDelete: true, canSend: true, canCancel: true, canReceive: false });
  assert.deepEqual(poActions('SENT'), { canEdit: false, canDelete: false, canSend: false, canCancel: true, canReceive: true });
  assert.equal(poActions('PARTIALLY_RECEIVED').canCancel, false);
  assert.equal(poActions('PARTIALLY_RECEIVED').canReceive, true);
  for (const s of ['RECEIVED', 'CANCELLED']) {
    assert.ok(Object.values(poActions(s)).every((v) => v === false), s);
  }
});

test('poProgress - phần trăm đã nhận', () => {
  assert.equal(poProgress({ items: [{ orderedQty: 100, receivedQty: 25 }, { orderedQty: 100, receivedQty: 75 }] }), 50);
  assert.equal(poProgress({ items: [] }), 0);
  assert.equal(poProgress(null), 0);
});

test('validatePoForm - form hợp lệ không có lỗi', () => {
  const form = {
    supplierId: 1, destinationWarehouseId: 2, expectedDeliveryDate: '2026-12-01',
    items: [{ productId: 5, orderedQty: 10, unitPrice: '' }],
  };
  assert.deepEqual(validatePoForm(form, '2026-11-04'), []);
});

test('validatePoForm - bắt các lỗi phổ biến', () => {
  const errors = validatePoForm({
    supplierId: '', destinationWarehouseId: '', expectedDeliveryDate: '2026-01-01',
    items: [{ productId: 5, orderedQty: 0 }, { productId: 5, orderedQty: 1.5 }, { productId: '', orderedQty: 2, unitPrice: -1 }],
  }, '2026-11-04');
  assert.ok(errors.includes('Chọn nhà cung cấp.'));
  assert.ok(errors.includes('Chọn kho nhận hàng.'));
  assert.ok(errors.includes('Ngày giao dự kiến không được ở quá khứ.'));
  assert.ok(errors.some((e) => e.includes('Dòng 1') && e.includes('lớn hơn 0')));
  assert.ok(errors.some((e) => e.includes('Dòng 2') && e.includes('lặp')));
  assert.ok(errors.some((e) => e.includes('Dòng 3') && e.includes('chọn sản phẩm')));
  assert.ok(errors.some((e) => e.includes('Dòng 3') && e.includes('đơn giá')));
});

test('validatePoForm - cần ít nhất một dòng sản phẩm', () => {
  assert.ok(validatePoForm({ supplierId: 1, destinationWarehouseId: 1, items: [] }).includes('Thêm ít nhất một sản phẩm.'));
});

test('buildPoPayload - ép kiểu số, giá trống thành null', () => {
  const payload = buildPoPayload({
    supplierId: '3', destinationWarehouseId: '4', expectedDeliveryDate: '', note: '  ghi chú  ',
    items: [{ productId: '9', orderedQty: '12', unitPrice: '' }, { productId: 10, orderedQty: 1, unitPrice: '25.5' }],
  });
  assert.deepEqual(payload, {
    supplierId: 3, destinationWarehouseId: 4, expectedDeliveryDate: null, note: 'ghi chú',
    items: [{ productId: 9, orderedQty: 12, unitPrice: null }, { productId: 10, orderedQty: 1, unitPrice: 25.5 }],
  });
});

test('poToForm - đưa PO về form sửa', () => {
  const form = poToForm({
    supplierId: 1, warehouseId: 2, expectedDeliveryDate: '2026-12-02', note: 'x',
    items: [{ productId: 7, orderedQty: 3, unitPrice: 10 }],
  });
  assert.equal(form.destinationWarehouseId, 2);
  assert.deepEqual(form.items, [{ productId: 7, orderedQty: 3, unitPrice: 10 }]);
});

const PO = {
  items: [
    { id: 1, productSku: 'SKU-1', orderedQty: 100, receivedQty: 60, remainingQty: 40 },
    { id: 2, productSku: 'SKU-2', orderedQty: 20, receivedQty: 0, remainingQty: 20 },
  ],
};

test('buildReceiveLines - chỉ gửi dòng có số lượng > 0', () => {
  const { lines, errors } = buildReceiveLines(PO, { 1: '40', 2: '0' });
  assert.deepEqual(errors, []);
  assert.deepEqual(lines, [{ itemId: 1, quantity: 40 }]);
});

test('buildReceiveLines - chặn nhận vượt số lượng còn lại', () => {
  const { lines, errors } = buildReceiveLines(PO, { 1: '41' });
  assert.equal(lines.length, 0);
  assert.ok(errors[0].includes('SKU-1') && errors[0].includes('40'));
});

test('buildReceiveLines - chặn số âm / số lẻ và yêu cầu nhập ít nhất một dòng', () => {
  assert.ok(buildReceiveLines(PO, { 1: '-1' }).errors.length > 0);
  assert.ok(buildReceiveLines(PO, { 1: '2.5' }).errors.length > 0);
  assert.deepEqual(buildReceiveLines(PO, {}).errors, ['Nhập số lượng nhận cho ít nhất một dòng.']);
});

test('todayIso - định dạng YYYY-MM-DD theo giờ địa phương', () => {
  assert.equal(todayIso(new Date(2026, 10, 4, 23, 59)), '2026-11-04');
});
