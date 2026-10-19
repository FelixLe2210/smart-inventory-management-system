/**
 * Logic dựng báo cáo giao dịch & tồn kho (client-side).
 * Sprint 6 - Milestone M4 (Sprint6-14, Sprint6-15, Sprint6-16)
 *
 * Shape trả về ({ summary, rows, ... }) cũng chính là contract mà
 * Transaction Report API (Sprint6-06) / Inventory Report API (Sprint6-07) nên trả về,
 * nên khi backend sẵn sàng UI dùng thẳng dữ liệu backend mà không phải đổi gì.
 */
import { getAvailableStock, getCurrentStock, getReservedStock } from './stockAlerts.js';

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ─────────────────────────── Báo cáo giao dịch ───────────────────────────

export const TRANSACTION_REPORT_TYPES = {
  RECEIVING: { label: 'Nhập kho', group: 'in' },
  ISSUING: { label: 'Xuất kho', group: 'out' },
  TRANSFER_IN: { label: 'Chuyển đến', group: 'transfer' },
  TRANSFER_OUT: { label: 'Chuyển đi', group: 'transfer' },
  ADJUSTMENT: { label: 'Điều chỉnh kiểm kê', group: 'adjust' },
};

/**
 * Kho "sở hữu" giao dịch (khớp cách backend ghi):
 *  RECEIVING / TRANSFER_IN → kho đích; còn lại (ISSUING, TRANSFER_OUT, ADJUSTMENT) → kho nguồn.
 * Nhờ vậy lọc theo kho không đếm đôi một lần chuyển kho.
 */
export function getOwningWarehouseId(tx) {
  if (!tx) return null;
  if (tx.transactionType === 'RECEIVING' || tx.transactionType === 'TRANSFER_IN') {
    return tx.destinationWarehouseId ?? tx.sourceWarehouseId ?? null;
  }
  return tx.sourceWarehouseId ?? tx.destinationWarehouseId ?? null;
}

/** Biến động tồn (có dấu) của một giao dịch lên kho sở hữu nó. */
export function getSignedDelta(tx) {
  const qty = toNumber(tx?.quantity);
  switch (tx?.transactionType) {
    case 'RECEIVING':
    case 'TRANSFER_IN':
      return qty;
    case 'ISSUING':
    case 'TRANSFER_OUT':
      return -qty;
    case 'ADJUSTMENT': {
      const before = tx.balanceBefore;
      const after = tx.balanceAfter;
      if (before === undefined || before === null || after === undefined || after === null) return 0;
      return toNumber(after) - toNumber(before);
    }
    default:
      return 0;
  }
}

/** Mốc thời gian đầu ngày / cuối ngày theo giờ địa phương từ chuỗi YYYY-MM-DD. */
function dayBoundary(dateStr, endOfDay) {
  if (!dateStr) return null;
  const [y, m, d] = String(dateStr).split('-').map(Number);
  if (!y || !m || !d) return null;
  return endOfDay ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function filterTransactionsForReport(
  transactions = [],
  { from = '', to = '', type = 'all', warehouseId = 'all', productId = 'all' } = {}
) {
  const start = dayBoundary(from, false);
  const end = dayBoundary(to, true);

  return transactions.filter((tx) => {
    if (type !== 'all' && tx.transactionType !== type) return false;
    if (productId !== 'all' && Number(tx.productId) !== Number(productId)) return false;
    if (warehouseId !== 'all' && Number(getOwningWarehouseId(tx)) !== Number(warehouseId)) return false;

    if (start || end) {
      const created = tx.createdAt ? new Date(tx.createdAt) : null;
      if (!created || Number.isNaN(created.getTime())) return false;
      if (start && created < start) return false;
      if (end && created > end) return false;
    }
    return true;
  });
}

/**
 * @returns {{
 *   summary: {totalCount:number, receivedQuantity:number, issuedQuantity:number,
 *             transferredQuantity:number, adjustmentCount:number, netChange:number},
 *   byType: Array<{type:string,label:string,count:number,quantity:number}>,
 *   rows: Array
 * }}
 */
export function buildTransactionReport(transactions = [], filters = {}) {
  // Loại giao dịch trùng id (an toàn khi gộp nhiều nguồn)
  const seen = new Set();
  const unique = transactions.filter((tx) => {
    if (tx?.id === undefined || tx?.id === null) return true;
    if (seen.has(tx.id)) return false;
    seen.add(tx.id);
    return true;
  });

  const rows = filterTransactionsForReport(unique, filters).sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );

  const byTypeMap = Object.fromEntries(
    Object.entries(TRANSACTION_REPORT_TYPES).map(([type, cfg]) => [
      type,
      { type, label: cfg.label, count: 0, quantity: 0 },
    ])
  );

  const summary = {
    totalCount: rows.length,
    receivedQuantity: 0,
    issuedQuantity: 0,
    transferredQuantity: 0,
    adjustmentCount: 0,
    netChange: 0,
  };

  rows.forEach((tx) => {
    const qty = toNumber(tx.quantity);
    const bucket = byTypeMap[tx.transactionType];
    if (bucket) {
      bucket.count += 1;
      bucket.quantity += qty;
    }
    switch (tx.transactionType) {
      case 'RECEIVING':
        summary.receivedQuantity += qty;
        break;
      case 'ISSUING':
        summary.issuedQuantity += qty;
        break;
      case 'TRANSFER_OUT':
        // Mỗi lần chuyển sinh 2 dòng (OUT + IN) cùng số lượng → chỉ cộng một phía.
        summary.transferredQuantity += qty;
        break;
      case 'ADJUSTMENT':
        summary.adjustmentCount += 1;
        break;
      default:
        break;
    }
    // Chuyển kho không đổi tổng tồn toàn hệ thống nên không tính vào netChange
    // khi xem toàn bộ kho; khi lọc theo kho thì phần chuyển đến/đi ảnh hưởng tồn kho đó.
    const isTransfer = tx.transactionType === 'TRANSFER_IN' || tx.transactionType === 'TRANSFER_OUT';
    if (!isTransfer || (filters.warehouseId && filters.warehouseId !== 'all')) {
      summary.netChange += getSignedDelta(tx);
    }
  });

  return { summary, byType: Object.values(byTypeMap), rows };
}

// ─────────────────────────── Báo cáo tồn kho ───────────────────────────

export const INVENTORY_STATUS_LABELS = {
  IN_STOCK: 'Còn hàng',
  LOW_STOCK: 'Sắp hết',
  OUT_OF_STOCK: 'Hết hàng',
  OVER_STOCK: 'Vượt định mức',
};

/** Trạng thái một dòng tồn kho: ưu tiên `stockStatus` backend, nếu thiếu thì tự tính giống Inventory.getStockStatus(). */
export function getRowStockStatus(inv, product) {
  if (inv?.stockStatus && INVENTORY_STATUS_LABELS[inv.stockStatus]) return inv.stockStatus;
  const current = getCurrentStock(inv);
  if (current <= 0) return 'OUT_OF_STOCK';
  const min = product?.minStockLevel ?? inv?.minStockLevel;
  const max = product?.maxStockLevel ?? inv?.maxStockLevel;
  if (min !== undefined && min !== null && current <= Number(min)) return 'LOW_STOCK';
  if (max !== undefined && max !== null && current > Number(max)) return 'OVER_STOCK';
  return 'IN_STOCK';
}

/**
 * @returns {{
 *   summary: {rowCount:number, totalQuantity:number, totalReserved:number, totalAvailable:number,
 *             totalValue:number, lowStockCount:number, outOfStockCount:number, overStockCount:number},
 *   rows: Array
 * }}
 */
export function buildInventoryReport(
  inventories = [],
  products = [],
  categories = [],
  warehouses = [],
  { warehouseId = 'all', categoryId = 'all', status = 'all', search = '' } = {}
) {
  const prodMap = new Map(products.map((p) => [p.id, p]));
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const whMap = new Map(warehouses.map((w) => [w.id, w]));
  const kw = String(search || '').trim().toLowerCase();

  const rows = [];
  inventories.forEach((inv) => {
    const p = prodMap.get(inv.productId);
    const wh = whMap.get(inv.warehouseId);
    const rowStatus = getRowStockStatus(inv, p);

    if (warehouseId !== 'all' && Number(inv.warehouseId) !== Number(warehouseId)) return;
    if (categoryId !== 'all' && Number(p?.categoryId) !== Number(categoryId)) return;
    if (status !== 'all' && rowStatus !== status) return;

    const sku = inv.productSku || p?.sku || `SKU #${inv.productId}`;
    const name = inv.productName || p?.name || `Sản phẩm #${inv.productId}`;
    if (kw && !`${sku} ${name}`.toLowerCase().includes(kw)) return;

    const current = getCurrentStock(inv);
    const unitCost = toNumber(p?.purchasePrice ?? p?.price);

    rows.push({
      inventoryId: inv.id,
      productId: inv.productId,
      sku,
      productName: name,
      unit: inv.productUnit || p?.unit || '',
      categoryName: (p?.categoryId && catMap.get(p.categoryId)) || 'Chưa phân loại',
      warehouseId: inv.warehouseId,
      warehouseCode: inv.warehouseCode || wh?.code || `WH-${inv.warehouseId}`,
      warehouseName: inv.warehouseName || wh?.name || `Kho #${inv.warehouseId}`,
      currentStock: current,
      reservedStock: getReservedStock(inv),
      availableStock: getAvailableStock(inv),
      minStockLevel: p?.minStockLevel ?? inv.minStockLevel ?? null,
      maxStockLevel: p?.maxStockLevel ?? inv.maxStockLevel ?? null,
      unitCost,
      stockValue: current * unitCost,
      status: rowStatus,
    });
  });

  rows.sort(
    (a, b) =>
      a.warehouseCode.localeCompare(b.warehouseCode, 'vi') || a.sku.localeCompare(b.sku, 'vi')
  );

  const summary = {
    rowCount: rows.length,
    totalQuantity: 0,
    totalReserved: 0,
    totalAvailable: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    overStockCount: 0,
  };
  rows.forEach((r) => {
    summary.totalQuantity += r.currentStock;
    summary.totalReserved += r.reservedStock;
    summary.totalAvailable += r.availableStock;
    summary.totalValue += r.stockValue;
    if (r.status === 'LOW_STOCK') summary.lowStockCount += 1;
    if (r.status === 'OUT_OF_STOCK') summary.outOfStockCount += 1;
    if (r.status === 'OVER_STOCK') summary.overStockCount += 1;
  });

  return { summary, rows };
}

// ─────────────────────────── Xác thực dữ liệu từ backend ───────────────────────────

const isObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** Phản hồi Transaction Report API hợp lệ khi có summary + rows[]. */
export function isValidTransactionReport(data) {
  return isObject(data) && isObject(data.summary) && Array.isArray(data.rows);
}

/** Phản hồi Inventory Report API hợp lệ khi có summary + rows[]. */
export function isValidInventoryReport(data) {
  return isObject(data) && isObject(data.summary) && Array.isArray(data.rows);
}

/** Phản hồi Dashboard KPI API hợp lệ khi đủ các chỉ số số học cốt lõi. */
export function isValidKpis(data) {
  if (!isObject(data)) return false;
  return ['totalProducts', 'totalStockQuantity', 'lowStockCount', 'outOfStockCount'].every(
    (k) => Number.isFinite(Number(data[k])) && data[k] !== null && data[k] !== undefined
  );
}

// ─────────────────────────── CSV ───────────────────────────

function escapeCsvCell(value) {
  if (value === undefined || value === null) return '';
  let str = String(value);
  // Chống CSV/formula injection khi mở bằng Excel
  if (/^[=+\-@]/.test(str) && Number.isNaN(Number(str))) str = `'${str}`;
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/**
 * @param {Array<{key:string, header:string, format?:(row:Object)=>any}>} columns
 * @param {Array<Object>} rows
 * @returns {string} CSV (không kèm BOM — BOM thêm lúc tải file)
 */
export function toCsv(columns, rows = []) {
  const head = columns.map((c) => escapeCsvCell(c.header)).join(',');
  const body = rows.map((row) =>
    columns.map((c) => escapeCsvCell(c.format ? c.format(row) : row[c.key])).join(',')
  );
  return [head, ...body].join('\r\n');
}

export const TRANSACTION_CSV_COLUMNS = [
  { key: 'transactionCode', header: 'Mã giao dịch' },
  { key: 'createdAt', header: 'Thời gian' },
  { key: 'transactionType', header: 'Loại giao dịch', format: (r) => TRANSACTION_REPORT_TYPES[r.transactionType]?.label || r.transactionType },
  { key: 'productSku', header: 'SKU' },
  { key: 'productName', header: 'Sản phẩm' },
  { key: 'quantity', header: 'Số lượng' },
  { key: 'balanceBefore', header: 'Tồn trước' },
  { key: 'balanceAfter', header: 'Tồn sau' },
  { key: 'referenceDoc', header: 'Chứng từ' },
  { key: 'reason', header: 'Lý do' },
];

export const INVENTORY_CSV_COLUMNS = [
  { key: 'sku', header: 'SKU' },
  { key: 'productName', header: 'Sản phẩm' },
  { key: 'categoryName', header: 'Danh mục' },
  { key: 'warehouseCode', header: 'Mã kho' },
  { key: 'warehouseName', header: 'Kho' },
  { key: 'currentStock', header: 'Tồn hiện tại' },
  { key: 'reservedStock', header: 'Giữ chỗ' },
  { key: 'availableStock', header: 'Khả dụng' },
  { key: 'minStockLevel', header: 'Tối thiểu' },
  { key: 'unitCost', header: 'Giá vốn' },
  { key: 'stockValue', header: 'Giá trị tồn' },
  { key: 'status', header: 'Trạng thái', format: (r) => INVENTORY_STATUS_LABELS[r.status] || r.status },
];
