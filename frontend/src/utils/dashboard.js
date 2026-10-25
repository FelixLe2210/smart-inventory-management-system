import {
  classifyStock,
  getAvailableStock,
  getCurrentStock,
  getReservedStock,
  isTrackedProduct,
} from './stockAlerts.js';

/**
 * Dashboard calculation utilities for Sprint 6 - Milestone M3
 * (M4: đọc `currentStock` của backend, dùng chung logic phân loại tồn với trang Cảnh báo)
 */

/**
 * Tính toán các chỉ số KPI tóm tắt từ dữ liệu kho, sản phẩm và tồn kho
 * @param {Array} products Danh sách sản phẩm
 * @param {Array} inventories Danh sách tồn kho
 * @param {Array} warehouses Danh sách kho bãi
 * @returns {Object} Các chỉ số KPI
 */
export function calculateKpis(products = [], inventories = [], warehouses = []) {
  const totalProducts = products.length;

  // Tổng số lượng tồn kho (quantity) & khả dụng
  let totalStockQuantity = 0;
  let totalReservedQuantity = 0;
  let totalAvailableQuantity = 0;
  let totalInventoryValue = 0; // Giá trị tồn kho (quantity * purchasePrice)

  // Map giá mua của sản phẩm
  const productPriceMap = new Map();
  const productMinStockMap = new Map();
  products.forEach((p) => {
    productPriceMap.set(p.id, Number(p.purchasePrice || p.price || 0));
    productMinStockMap.set(p.id, Number(p.minStockLevel || 0));
  });

  // Tổng hợp theo từng sản phẩm qua các kho
  const productStockAggregation = new Map();

  inventories.forEach((item) => {
    const qty = getCurrentStock(item);
    const rsv = getReservedStock(item);
    const avail = getAvailableStock(item);

    totalStockQuantity += qty;
    totalReservedQuantity += rsv;
    totalAvailableQuantity += avail;

    const price = productPriceMap.get(item.productId) || 0;
    totalInventoryValue += qty * price;

    const currentAgg = productStockAggregation.get(item.productId) || {
      quantity: 0,
      available: 0,
      minStock: productMinStockMap.get(item.productId) || 0,
    };
    currentAgg.quantity += qty;
    currentAgg.available += avail;
    productStockAggregation.set(item.productId, currentAgg);
  });

  // Đếm số sản phẩm hết hàng và sắp hết hàng
  let outOfStockCount = 0;
  let lowStockCount = 0;

  products.forEach((p) => {
    if (!isTrackedProduct(p)) return;
    const agg = productStockAggregation.get(p.id);
    const available = agg ? agg.available : 0;
    const status = classifyStock(available, p.minStockLevel);

    if (status === 'OUT_OF_STOCK') {
      outOfStockCount++;
    } else if (status === 'LOW_STOCK') {
      lowStockCount++;
    }
  });

  const activeWarehouses = warehouses.filter((w) => w.status === 'ACTIVE').length;

  return {
    totalProducts,
    totalStockQuantity,
    totalReservedQuantity,
    totalAvailableQuantity,
    totalInventoryValue,
    outOfStockCount,
    lowStockCount,
    totalWarehouses: warehouses.length,
    activeWarehouses,
  };
}

/**
 * Thống kê tỷ lệ phân bổ tồn kho theo danh mục sản phẩm (Category Distribution)
 * @param {Array} inventories 
 * @param {Array} products 
 * @param {Array} categories 
 * @returns {Array<{name: string, quantity: number, value: number, percentage: number}>}
 */
export function calculateCategoryDistribution(inventories = [], products = [], categories = []) {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const productCategoryMap = new Map();
  const productPriceMap = new Map();

  products.forEach((p) => {
    productCategoryMap.set(p.id, p.categoryId);
    productPriceMap.set(p.id, Number(p.purchasePrice || p.price || 0));
  });

  const categoryTotals = new Map();
  let totalQty = 0;

  inventories.forEach((item) => {
    const catId = productCategoryMap.get(item.productId);
    const catName = (catId && categoryMap.get(catId)) || 'Chưa phân loại';
    const qty = getCurrentStock(item);
    const price = productPriceMap.get(item.productId) || 0;
    const val = qty * price;

    totalQty += qty;

    const curr = categoryTotals.get(catName) || { name: catName, quantity: 0, value: 0 };
    curr.quantity += qty;
    curr.value += val;
    categoryTotals.set(catName, curr);
  });

  const result = Array.from(categoryTotals.values()).map((c) => ({
    ...c,
    percentage: totalQty > 0 ? Math.round((c.quantity / totalQty) * 100) : 0,
  }));

  // Sắp xếp giảm dần theo số lượng
  return result.sort((a, b) => b.quantity - a.quantity);
}

/**
 * Thống kê tồn kho theo từng kho (Stock per Warehouse)
 * @param {Array} inventories 
 * @param {Array} warehouses 
 * @returns {Array<{id: number, name: string, code: string, quantity: number, available: number, itemCount: number}>}
 */
export function calculateWarehouseStock(inventories = [], warehouses = []) {
  const warehouseMap = new Map(warehouses.map((w) => [w.id, w]));
  const whTotals = new Map();

  inventories.forEach((item) => {
    const wh = warehouseMap.get(item.warehouseId);
    const whId = item.warehouseId;
    const whName = wh ? wh.name : `Kho #${whId}`;
    const whCode = wh ? wh.code : `WH-${whId}`;
    const qty = getCurrentStock(item);
    const avail = getAvailableStock(item);

    const curr = whTotals.get(whId) || {
      id: whId,
      name: whName,
      code: whCode,
      quantity: 0,
      available: 0,
      itemCount: 0,
    };

    curr.quantity += qty;
    curr.available += avail;
    curr.itemCount += 1;
    whTotals.set(whId, curr);
  });

  return Array.from(whTotals.values()).sort((a, b) => b.quantity - a.quantity);
}

/**
 * Thống kê biến động giao dịch theo loại giao dịch
 * @param {Array} transactions 
 * @returns {Object} Tổng hợp theo từng loại giao dịch
 */
export function calculateTransactionBreakdown(transactions = []) {
  const breakdown = {
    RECEIVING: { count: 0, totalQuantity: 0, label: 'Nhập kho', color: '#10b981' },
    ISSUING: { count: 0, totalQuantity: 0, label: 'Xuất kho', color: '#ef4444' },
    TRANSFER_IN: { count: 0, totalQuantity: 0, label: 'Chuyển đến', color: '#3b82f6' },
    TRANSFER_OUT: { count: 0, totalQuantity: 0, label: 'Chuyển đi', color: '#f59e0b' },
    ADJUSTMENT: { count: 0, totalQuantity: 0, label: 'Điều chỉnh', color: '#8b5cf6' },
  };

  transactions.forEach((tx) => {
    const type = tx.transactionType;
    if (breakdown[type]) {
      breakdown[type].count += 1;
      breakdown[type].totalQuantity += Number(tx.quantity || 0);
    }
  });

  return breakdown;
}
