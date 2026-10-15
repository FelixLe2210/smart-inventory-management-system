/**
 * Utility functions & validation rules for Stock Movement (Receiving / Issuing / Transactions)
 * Sprint 5 - M3
 */

/**
 * Validate receiving form input
 * @param {Object} params
 * @param {number|string} params.productId
 * @param {number|string} params.warehouseId
 * @param {number|string} params.quantity
 * @param {string} [params.referenceDoc]
 * @param {string} [params.reason]
 * @returns {Record<string, string>} error map
 */
export function validateReceiving({ productId, warehouseId, quantity, referenceDoc, reason }) {
  const errors = {};
  if (!productId) errors.productId = 'Vui lòng chọn sản phẩm nhập kho';
  if (!warehouseId) errors.warehouseId = 'Vui lòng chọn kho nhận hàng';

  const qty = Number(quantity);
  if (quantity === '' || quantity === null || quantity === undefined || !Number.isInteger(qty) || qty <= 0) {
    errors.quantity = 'Số lượng nhập phải là số nguyên dương (> 0)';
  }

  if (referenceDoc && referenceDoc.length > 50) {
    errors.referenceDoc = 'Mã chứng từ / số hoá đơn không quá 50 ký tự';
  }
  if (reason && reason.length > 255) {
    errors.reason = 'Ghi chú / lý do không quá 255 ký tự';
  }

  return errors;
}

/**
 * Validate issuing form input
 * @param {Object} params
 * @param {number|string} params.productId
 * @param {number|string} params.warehouseId
 * @param {number|string} params.quantity
 * @param {number} [params.availableStock]
 * @param {string} [params.referenceDoc]
 * @param {string} [params.reason]
 * @returns {Record<string, string>} error map
 */
export function validateIssuing({ productId, warehouseId, quantity, availableStock = 0, referenceDoc, reason }) {
  const errors = {};
  if (!productId) errors.productId = 'Vui lòng chọn sản phẩm xuất kho';
  if (!warehouseId) errors.warehouseId = 'Vui lòng chọn kho xuất hàng';

  const qty = Number(quantity);
  if (quantity === '' || quantity === null || quantity === undefined || !Number.isInteger(qty) || qty <= 0) {
    errors.quantity = 'Số lượng xuất phải là số nguyên dương (> 0)';
  } else if (qty > availableStock) {
    errors.quantity = `Số lượng xuất (${qty}) vượt quá tồn khả dụng (${availableStock})`;
  }

  if (referenceDoc && referenceDoc.length > 50) {
    errors.referenceDoc = 'Mã phiếu xuất / số đơn không quá 50 ký tự';
  }
  if (reason && reason.length > 255) {
    errors.reason = 'Lý do xuất không quá 255 ký tự';
  }

  return errors;
}

/**
 * Filter transaction history records by criteria
 * @param {Array} list
 * @param {Object} filters
 * @param {string} [filters.type]
 * @param {number|string} [filters.warehouseId]
 * @param {number|string} [filters.productId]
 * @param {string} [filters.search]
 * @returns {Array} filtered list
 */
export function filterTransactions(list = [], { type = 'all', warehouseId = 'all', productId = 'all', search = '' } = {}) {
  const kw = (search || '').trim().toLowerCase();
  return list.filter((t) => {
    if (type !== 'all' && t.transactionType !== type) return false;
    if (warehouseId !== 'all') {
      const whId = Number(warehouseId);
      if (t.sourceWarehouseId !== whId && t.destinationWarehouseId !== whId) return false;
    }
    if (productId !== 'all' && Number(t.productId) !== Number(productId)) return false;

    if (!kw) return true;
    return [
      t.transactionCode,
      t.referenceDoc,
      t.reason,
      t.productSku,
      t.productName,
    ].some((v) => (v || '').toLowerCase().includes(kw));
  });
}
