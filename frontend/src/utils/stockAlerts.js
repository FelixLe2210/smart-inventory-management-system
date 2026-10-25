/**
 * Logic cảnh báo tồn kho dùng chung cho Dashboard (KPI + danh sách) và trang Cảnh báo.
 * Sprint 6 - Milestone M4 (Sprint6-13, Sprint6-15, Sprint6-16)
 *
 * Quy ước (khớp backend `InventoryResponse`):
 *  - Số lượng tồn nằm ở `currentStock` (bản cũ/mock dùng `quantity` → vẫn được hỗ trợ).
 *  - Tồn khả dụng = `availableStock`, hoặc currentStock - reservedStock.
 *  - Cảnh báo tính theo SẢN PHẨM (cộng dồn các kho):
 *      OUT_OF_STOCK : khả dụng <= 0
 *      LOW_STOCK    : minStockLevel > 0 và 0 < khả dụng <= minStockLevel
 */

export const ALERT_TYPES = {
  OUT_OF_STOCK: {
    label: 'Hết hàng',
    english: 'Out of Stock',
    rank: 0,
    priority: 'high',
    icon: 'error',
    badge: 'bg-red-50 text-red-700 border-red-200',
    text: 'text-red-600',
    bar: 'bg-red-500',
  },
  LOW_STOCK: {
    label: 'Sắp hết hàng',
    english: 'Low Stock',
    rank: 1,
    priority: 'medium',
    icon: 'warning',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    text: 'text-amber-600',
    bar: 'bg-amber-500',
  },
};

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Tồn hiện tại của một dòng tồn kho (hỗ trợ `currentStock` của backend và `quantity` cũ). */
export function getCurrentStock(inv) {
  if (!inv) return 0;
  return toNumber(inv.currentStock ?? inv.quantity);
}

export function getReservedStock(inv) {
  return toNumber(inv?.reservedStock);
}

/** Tồn khả dụng của một dòng tồn kho (không bao giờ âm, giống backend). */
export function getAvailableStock(inv) {
  if (!inv) return 0;
  if (inv.availableStock !== undefined && inv.availableStock !== null) {
    return Math.max(0, toNumber(inv.availableStock));
  }
  return Math.max(0, getCurrentStock(inv) - getReservedStock(inv));
}

/** Sản phẩm có được theo dõi cảnh báo không (bỏ qua sản phẩm ngừng hoạt động). */
export function isTrackedProduct(product) {
  if (!product) return false;
  if (!product.status) return true;
  return String(product.status).toUpperCase() === 'ACTIVE';
}

/**
 * Phân loại mức tồn.
 * @returns {'OUT_OF_STOCK'|'LOW_STOCK'|'OK'}
 */
export function classifyStock(available, minStock) {
  const avail = toNumber(available);
  const min = toNumber(minStock);
  if (avail <= 0) return 'OUT_OF_STOCK';
  if (min > 0 && avail <= min) return 'LOW_STOCK';
  return 'OK';
}

function buildMessage(type, available, minStock) {
  if (type === 'OUT_OF_STOCK') return 'Đã hết hàng trong kho';
  return `Sắp hết hàng (${available}/${minStock})`;
}

/**
 * Tạo danh sách cảnh báo (đã sắp xếp: hết hàng trước, thiếu hụt nhiều trước).
 * @returns {Array<{id:string, product:Object, type:string, priority:string, available:number,
 *   minStock:number, shortage:number, message:string,
 *   warehouses:Array<{warehouseId:number, code:string, name:string, available:number}>}>}
 */
export function buildStockAlerts(products = [], inventories = [], warehouses = []) {
  const whMap = new Map(warehouses.map((w) => [w.id, w]));
  const byProduct = new Map();

  inventories.forEach((inv) => {
    const entry = byProduct.get(inv.productId) || { available: 0, rows: [] };
    const avail = getAvailableStock(inv);
    entry.available += avail;
    const wh = whMap.get(inv.warehouseId);
    entry.rows.push({
      warehouseId: inv.warehouseId,
      code: inv.warehouseCode || wh?.code || `WH-${inv.warehouseId}`,
      name: inv.warehouseName || wh?.name || `Kho #${inv.warehouseId}`,
      available: avail,
    });
    byProduct.set(inv.productId, entry);
  });

  const alerts = [];
  products.forEach((p) => {
    if (!isTrackedProduct(p)) return;
    const entry = byProduct.get(p.id);
    const available = entry ? entry.available : 0;
    const minStock = toNumber(p.minStockLevel);
    const type = classifyStock(available, minStock);
    if (type === 'OK') return;

    alerts.push({
      id: `${type}-${p.id}`,
      product: p,
      type,
      priority: ALERT_TYPES[type].priority,
      available,
      minStock,
      shortage: Math.max(0, minStock - available),
      message: buildMessage(type, available, minStock),
      warehouses: entry ? entry.rows : [],
    });
  });

  return sortAlerts(alerts);
}

/** Hết hàng trước → sắp hết; cùng loại thì thiếu hụt nhiều hơn lên trước, rồi theo tên. */
export function sortAlerts(alerts = []) {
  return [...alerts].sort((a, b) => {
    const rank = (ALERT_TYPES[a.type]?.rank ?? 9) - (ALERT_TYPES[b.type]?.rank ?? 9);
    if (rank !== 0) return rank;
    if (b.shortage !== a.shortage) return b.shortage - a.shortage;
    return String(a.product?.name || '').localeCompare(String(b.product?.name || ''), 'vi');
  });
}

export function summarizeAlerts(alerts = []) {
  const outOfStock = alerts.filter((a) => a.type === 'OUT_OF_STOCK').length;
  const lowStock = alerts.filter((a) => a.type === 'LOW_STOCK').length;
  return { total: alerts.length, outOfStock, lowStock };
}

export function filterAlerts(alerts = [], { type = 'all', search = '' } = {}) {
  const kw = String(search || '').trim().toLowerCase();
  return alerts.filter((a) => {
    if (type !== 'all' && a.type !== type) return false;
    if (!kw) return true;
    return [a.product?.name, a.product?.sku].some((v) => String(v || '').toLowerCase().includes(kw));
  });
}

/**
 * Chuẩn hóa cảnh báo do Alert API (Sprint6-03) trả về về cùng shape với `buildStockAlerts`.
 * Chấp nhận dạng phẳng (productId/productSku/productName/alertType/...) hoặc dạng lồng (product: {...}).
 * Trả về null nếu bản ghi không hợp lệ.
 */
export function normalizeBackendAlert(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const type = String(raw.type ?? raw.alertType ?? raw.stockStatus ?? '').toUpperCase();
  if (!ALERT_TYPES[type]) return null;

  const product = raw.product || {
    id: raw.productId,
    sku: raw.productSku,
    name: raw.productName,
    minStockLevel: raw.minStockLevel,
  };
  const available = toNumber(raw.available ?? raw.availableStock ?? raw.currentStock);
  const minStock = toNumber(raw.minStock ?? raw.minStockLevel ?? product.minStockLevel);

  return {
    id: raw.id ?? `${type}-${product.id}`,
    product,
    type,
    priority: ALERT_TYPES[type].priority,
    available,
    minStock,
    shortage: toNumber(raw.shortage ?? Math.max(0, minStock - available)),
    message: raw.message || buildMessage(type, available, minStock),
    warehouses: Array.isArray(raw.warehouses) ? raw.warehouses : [],
  };
}

/** Chuẩn hóa cả mảng; trả về null nếu phản hồi không phải mảng (→ coi như API chưa sẵn sàng). */
export function normalizeBackendAlerts(list) {
  if (!Array.isArray(list)) return null;
  return sortAlerts(list.map(normalizeBackendAlert).filter(Boolean));
}
