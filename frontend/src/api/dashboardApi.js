import { httpClient } from './httpClient';
import { inventoryApi } from './inventoryApi';
import { productApi } from './productApi';
import { warehouseApi } from './warehouseApi';
import { categoryApi } from './categoryApi';
import { cleanParams, isEndpointMissing } from '../utils/apiFallback';

/**
 * Lớp tích hợp Dashboard / Cảnh báo / Báo cáo.
 * Sprint 6 - Milestone M4 (Sprint6-15: Dashboard API Integration)
 *
 * Chiến lược "backend-first, client-fallback":
 *  1. Gọi endpoint tổng hợp của backend (M1/M2: Alert API, Dashboard KPI API, Report APIs).
 *  2. Nếu endpoint chưa tồn tại (404/405/501) hoặc phản hồi sai contract → trả về `null`,
 *     hook sẽ tự tính từ dữ liệu Master/Inventory như trước (và hiển thị nguồn dữ liệu = "client").
 *  3. Các lỗi khác (401, 403, 500, mất mạng...) KHÔNG bị nuốt — được ném ra để UI báo lỗi thật.
 *
 * Contract chi tiết: docs/api/DASHBOARD_API_CONTRACT.md
 */

export const DASHBOARD_ENDPOINTS = {
  kpis: '/dashboard/kpis',
  stockAlerts: '/alerts/stock',
  transactionReport: '/reports/transactions',
  inventoryReport: '/reports/inventory',
};

/** GET một endpoint tổng hợp; trả về `null` nếu backend chưa triển khai endpoint đó. */
async function getOrNull(path, params) {
  try {
    const res = await httpClient.get(path, { params: cleanParams(params) });
    return res?.data ?? null;
  } catch (err) {
    if (isEndpointMissing(err)) return null;
    throw err;
  }
}

export const dashboardApi = {
  /** Sprint6-05 — KPI dashboard. */
  getKpis() {
    return getOrNull(DASHBOARD_ENDPOINTS.kpis);
  },

  /** Sprint6-03 — cảnh báo tồn kho. @param {{type?: 'LOW_STOCK'|'OUT_OF_STOCK'}} params */
  getStockAlerts(params = {}) {
    return getOrNull(DASHBOARD_ENDPOINTS.stockAlerts, params);
  },

  /** Sprint6-06 — báo cáo giao dịch. @param {{from?:string,to?:string,type?:string,warehouseId?:number,productId?:number}} params */
  getTransactionReport(params = {}) {
    return getOrNull(DASHBOARD_ENDPOINTS.transactionReport, params);
  },

  /** Sprint6-07 — báo cáo tồn kho. @param {{warehouseId?:number,categoryId?:number,status?:string}} params */
  getInventoryReport(params = {}) {
    return getOrNull(DASHBOARD_ENDPOINTS.inventoryReport, params);
  },
};

const SNAPSHOT_SOURCES = [
  ['products', 'Sản phẩm', () => productApi.getAll()],
  ['warehouses', 'Kho', () => warehouseApi.getAll()],
  ['categories', 'Danh mục', () => categoryApi.getAll()],
  ['inventories', 'Tồn kho', () => inventoryApi.getAll()],
];

/**
 * Nạp dữ liệu nền (sản phẩm, kho, danh mục, tồn kho) song song.
 * Một nguồn lỗi không làm hỏng các nguồn còn lại; tên nguồn lỗi được trả về trong `failed`.
 */
export async function loadMasterSnapshot() {
  const results = await Promise.allSettled(SNAPSHOT_SOURCES.map(([, , load]) => load()));
  const snapshot = { products: [], warehouses: [], categories: [], inventories: [], failed: [] };

  results.forEach((res, idx) => {
    const [key, label] = SNAPSHOT_SOURCES[idx];
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      snapshot[key] = res.value;
    } else {
      snapshot.failed.push(label);
    }
  });
  return snapshot;
}

/**
 * Nạp giao dịch kho của các dòng tồn kho (chưa có endpoint "tất cả giao dịch").
 * Chạy theo từng đợt `concurrency` request để không làm nghẽn backend.
 * Gắn thêm thông tin sản phẩm/kho và loại trùng theo id.
 *
 * @param {Array} inventories
 * @param {{products?:Array, warehouses?:Array, limit?:number, concurrency?:number}} options
 * @returns {Promise<{transactions:Array, failedCount:number, truncated:boolean}>}
 */
export async function loadTransactionsForInventories(
  inventories = [],
  { products = [], warehouses = [], limit = Infinity, concurrency = 6 } = {}
) {
  const ordered = [...inventories].sort(
    (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
  );
  const targets = Number.isFinite(limit) ? ordered.slice(0, limit) : ordered;

  const prodMap = new Map(products.map((p) => [p.id, p]));
  const whMap = new Map(warehouses.map((w) => [w.id, w]));
  const byId = new Map();
  let failedCount = 0;

  for (let i = 0; i < targets.length; i += concurrency) {
    const batch = targets.slice(i, i + concurrency);
    const settled = await Promise.allSettled(batch.map((inv) => inventoryApi.getTransactions(inv.id)));

    settled.forEach((res) => {
      if (res.status !== 'fulfilled' || !Array.isArray(res.value)) {
        failedCount += 1;
        return;
      }
      res.value.forEach((tx) => {
        const key = tx.id ?? tx.transactionCode;
        if (byId.has(key)) return;
        const p = prodMap.get(tx.productId);
        const src = whMap.get(tx.sourceWarehouseId);
        const dst = whMap.get(tx.destinationWarehouseId);
        byId.set(key, {
          ...tx,
          productSku: tx.productSku || p?.sku || `SKU #${tx.productId}`,
          productName: tx.productName || p?.name || `Sản phẩm #${tx.productId}`,
          sourceWarehouseCode: src?.code || '',
          destinationWarehouseCode: dst?.code || '',
        });
      });
    });
  }

  const transactions = [...byId.values()].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );
  return { transactions, failedCount, truncated: targets.length < inventories.length };
}
