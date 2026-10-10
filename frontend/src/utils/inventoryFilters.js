/**
 * Logic thuần (không phụ thuộc React) cho trang Tồn kho – Sprint4-13/14.
 * Có test: utils/inventoryFilters.test.mjs (chạy: node --test src/utils).
 */

/** Tính số liệu KPI từ danh sách tồn kho. */
export function summarize(list) {
  const s = { totalItems: list.length, inStock: 0, lowStock: 0, outOfStock: 0, overStock: 0, totalUnits: 0 };
  list.forEach((i) => {
    if (i.stockStatus === 'IN_STOCK') s.inStock += 1;
    else if (i.stockStatus === 'LOW_STOCK') s.lowStock += 1;
    else if (i.stockStatus === 'OUT_OF_STOCK') s.outOfStock += 1;
    else if (i.stockStatus === 'OVER_STOCK') s.overStock += 1;
    s.totalUnits += Number(i.currentStock) || 0;
  });
  return s;
}

/** Lọc theo trạng thái tồn ('all' = không lọc) + từ khóa (không phân biệt hoa/thường). */
export function filterInventory(list, status = 'all', keyword = '') {
  const kw = (keyword || '').trim().toLowerCase();
  return list.filter((i) => {
    if (status !== 'all' && i.stockStatus !== status) return false;
    if (!kw) return true;
    return [i.productSku, i.productName, i.productBarcode, i.warehouseCode, i.warehouseName, i.locationInWarehouse]
      .some((v) => (v || '').toLowerCase().includes(kw));
  });
}

/**
 * Kiểm tra trước (client) một lần điều chỉnh tồn, khớp quy tắc ở InventoryService.adjustStock.
 * @returns {string|null} thông báo lỗi, hoặc null nếu hợp lệ
 */
export function validateAdjustment(item, type, quantity) {
  const qty = Number(quantity);
  if (quantity === '' || quantity === null || quantity === undefined || !Number.isInteger(qty) || qty < 0) {
    return 'Số lượng phải là số nguyên không âm';
  }
  if (type !== 'SET' && qty <= 0) return 'Số lượng phải lớn hơn 0';
  if ((type === 'OUT' || type === 'RESERVE') && qty > (item.availableStock ?? 0)) {
    return `Vượt tồn khả dụng (${item.availableStock ?? 0})`;
  }
  if (type === 'RELEASE' && qty > item.reservedStock) return `Vượt số đang giữ chỗ (${item.reservedStock})`;
  if (type === 'SET' && qty < item.reservedStock) {
    return `Tồn mới không được nhỏ hơn số đang giữ chỗ (${item.reservedStock})`;
  }
  return null;
}
