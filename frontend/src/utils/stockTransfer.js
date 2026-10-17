/**
 * Quy tắc & hàm tiện ích cho Chuyển kho (Stock Transfer).
 * Sprint 5 - M4 (Sprint5-13 Stock Transfer UI/Flow, Sprint5-14 Transaction API Integration)
 *
 * Backend: POST /api/inventories/{sourceInventoryId}/transfer
 *   body { destinationWarehouseId, quantity, reason?, referenceDoc? }
 * Quy tắc phía backend được lặp lại ở đây để báo lỗi sớm, nhưng backend vẫn là nơi quyết định cuối cùng.
 */

const toInt = (v) => {
  if (v === '' || v === null || v === undefined) return NaN;
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
};

/**
 * @param {Object} p
 * @param {number|string} p.productId
 * @param {number|string} p.sourceWarehouseId
 * @param {number|string} p.destinationWarehouseId
 * @param {number|string} p.quantity
 * @param {number} [p.availableStock] tồn khả dụng tại kho nguồn (nếu đã biết)
 * @param {string} [p.referenceDoc]
 * @param {string} [p.reason]
 * @returns {Record<string,string>} map lỗi theo tên ô
 */
export function validateTransfer({
  productId, sourceWarehouseId, destinationWarehouseId, quantity, availableStock, referenceDoc, reason,
}) {
  const errors = {};
  if (!productId) errors.productId = 'Vui lòng chọn sản phẩm cần chuyển';
  if (!sourceWarehouseId) errors.sourceWarehouseId = 'Vui lòng chọn kho nguồn';
  if (!destinationWarehouseId) errors.destinationWarehouseId = 'Vui lòng chọn kho đích';
  if (sourceWarehouseId && destinationWarehouseId && Number(sourceWarehouseId) === Number(destinationWarehouseId)) {
    errors.destinationWarehouseId = 'Kho đích phải khác kho nguồn';
  }

  const qty = toInt(quantity);
  if (Number.isNaN(qty) || qty <= 0) {
    errors.quantity = 'Số lượng chuyển phải là số nguyên dương (> 0)';
  } else if (typeof availableStock === 'number' && qty > availableStock) {
    errors.quantity = `Số lượng chuyển (${qty}) vượt quá tồn khả dụng tại kho nguồn (${availableStock})`;
  }

  if (referenceDoc && referenceDoc.length > 50) errors.referenceDoc = 'Mã chứng từ không quá 50 ký tự';
  if (reason && reason.length > 255) errors.reason = 'Lý do không quá 255 ký tự';
  return errors;
}

/** Tập ID kho đang ACTIVE; null nếu không truyền danh sách kho (không lọc theo trạng thái kho). */
const activeWarehouseIds = (warehouses) =>
  warehouses ? new Set(warehouses.filter((w) => w.status === 'ACTIVE').map((w) => Number(w.id))) : null;

/**
 * Các dòng tồn có thể làm kho nguồn: đúng sản phẩm, còn tồn khả dụng > 0 (nhiều hàng nhất trước).
 * Truyền `warehouses` để loại các kho không ACTIVE: backend từ chối chuyển khi KHO NGUỒN không hoạt động.
 */
export function getSourceOptions(inventories = [], productId, warehouses) {
  if (!productId) return [];
  const active = activeWarehouseIds(warehouses);
  return inventories
    .filter(
      (i) =>
        Number(i.productId) === Number(productId) &&
        Number(i.availableStock || 0) > 0 &&
        (!active || active.has(Number(i.warehouseId)))
    )
    .sort((a, b) => Number(b.availableStock || 0) - Number(a.availableStock || 0));
}

/** Kho đích hợp lệ: đang ACTIVE và khác kho nguồn. */
export function getDestinationOptions(warehouses = [], sourceWarehouseId) {
  return warehouses.filter(
    (w) => w.status === 'ACTIVE' && (!sourceWarehouseId || Number(w.id) !== Number(sourceWarehouseId))
  );
}

/** Sản phẩm có thể chuyển: ACTIVE và có ít nhất một dòng tồn khả dụng > 0 (tại kho ACTIVE nếu có truyền `warehouses`). */
export function getTransferableProducts(products = [], inventories = [], warehouses) {
  const active = activeWarehouseIds(warehouses);
  const withStock = new Set(
    inventories
      .filter((i) => Number(i.availableStock || 0) > 0 && (!active || active.has(Number(i.warehouseId))))
      .map((i) => Number(i.productId))
  );
  return products.filter((p) => (p.status || 'ACTIVE') === 'ACTIVE' && withStock.has(Number(p.id)));
}

/** Xem trước tồn sau khi chuyển. destinationInventory = null nghĩa là kho đích chưa có dòng tồn (backend tự tạo). */
export function previewTransfer({ sourceInventory, destinationInventory, quantity }) {
  const qty = Number(quantity) > 0 ? Number(quantity) : 0;
  const sourceBefore = sourceInventory ? Number(sourceInventory.currentStock || 0) : 0;
  const destinationBefore = destinationInventory ? Number(destinationInventory.currentStock || 0) : 0;
  return {
    quantity: qty,
    sourceBefore,
    sourceAfter: sourceBefore - qty,
    destinationBefore,
    destinationAfter: destinationBefore + qty,
    destinationIsNew: !destinationInventory,
  };
}

/**
 * Đối chiếu tồn THẬT từ server sau giao dịch: kho nguồn giảm đúng qty, kho đích tăng đúng qty,
 * tổng không đổi. Dùng để phát hiện lệch dữ liệu thay vì tin hoàn toàn vào phản hồi thành công.
 * @returns {{ok:boolean, problems:string[]}}
 */
export function verifyTransferResult({ sourceBefore, destinationBefore, sourceAfter, destinationAfter, quantity }) {
  const problems = [];
  if (sourceAfter !== sourceBefore - quantity) {
    problems.push(`Kho nguồn: kỳ vọng ${sourceBefore - quantity}, thực tế ${sourceAfter}`);
  }
  if (destinationAfter !== destinationBefore + quantity) {
    problems.push(`Kho đích: kỳ vọng ${destinationBefore + quantity}, thực tế ${destinationAfter}`);
  }
  if (sourceAfter + destinationAfter !== sourceBefore + destinationBefore) {
    problems.push('Tổng tồn hai kho thay đổi sau khi chuyển');
  }
  return { ok: problems.length === 0, problems };
}
