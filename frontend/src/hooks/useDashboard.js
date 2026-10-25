import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { dashboardApi, loadMasterSnapshot, loadTransactionsForInventories } from '../api/dashboardApi';
import {
  calculateKpis,
  calculateCategoryDistribution,
  calculateWarehouseStock,
  calculateTransactionBreakdown,
} from '../utils/dashboard';
import { buildStockAlerts, normalizeBackendAlerts, summarizeAlerts } from '../utils/stockAlerts';
import { isValidKpis } from '../utils/reports';

/** Số dòng tồn kho (mới cập nhật nhất) dùng để lấy giao dịch gần đây cho dashboard. */
const RECENT_INVENTORY_LIMIT = 15;
/** Số cảnh báo hiển thị trên dashboard (xem đầy đủ ở trang /alerts). */
const DASHBOARD_ALERT_LIMIT = 6;

/**
 * Hook useDashboard
 * Quản trị trạng thái và dữ liệu tổng hợp cho Bàn làm việc (Dashboard)
 *  - Sprint 6 M3 (Sprint6-09 → Sprint6-12): bố cục, KPI, biểu đồ, giao dịch gần đây
 *  - Sprint 6 M4 (Sprint6-15): kết nối backend (KPI API + Alert API) có fallback tính tại client
 */
export function useDashboard() {
  const [snapshot, setSnapshot] = useState({
    products: [],
    warehouses: [],
    categories: [],
    inventories: [],
  });
  const [transactions, setTransactions] = useState([]);
  const [backendKpis, setBackendKpis] = useState(null);
  const [backendAlerts, setBackendAlerts] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  // Chống race condition khi bấm "Làm mới" liên tục: chỉ áp dụng kết quả của lần gọi mới nhất.
  const requestIdRef = useRef(0);

  const fetchDashboardData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const [snap, kpiRes, alertRes] = await Promise.allSettled([
        loadMasterSnapshot(),
        dashboardApi.getKpis(),
        dashboardApi.getStockAlerts(),
      ]);
      if (requestId !== requestIdRef.current) return;

      const nextWarnings = [];
      const data =
        snap.status === 'fulfilled'
          ? snap.value
          : { products: [], warehouses: [], categories: [], inventories: [], failed: ['Dữ liệu nền'] };

      if (data.failed.length > 0) {
        nextWarnings.push(`Không tải được: ${data.failed.join(', ')}. Số liệu có thể chưa đầy đủ.`);
      }

      // KPI từ backend: chỉ dùng khi đúng contract, ngược lại tính tại client.
      if (kpiRes.status === 'fulfilled' && isValidKpis(kpiRes.value)) {
        setBackendKpis(kpiRes.value);
      } else {
        setBackendKpis(null);
        if (kpiRes.status === 'rejected') {
          nextWarnings.push('KPI API gặp lỗi — đang hiển thị số liệu tính từ dữ liệu tồn kho.');
        }
      }

      const normalizedAlerts =
        alertRes.status === 'fulfilled' ? normalizeBackendAlerts(alertRes.value) : null;
      setBackendAlerts(normalizedAlerts);
      if (alertRes.status === 'rejected') {
        nextWarnings.push('Alert API gặp lỗi — đang hiển thị cảnh báo tính từ dữ liệu tồn kho.');
      }

      setSnapshot({
        products: data.products,
        warehouses: data.warehouses,
        categories: data.categories,
        inventories: data.inventories,
      });

      // Giao dịch gần đây
      const txResult = await loadTransactionsForInventories(data.inventories, {
        products: data.products,
        warehouses: data.warehouses,
        limit: RECENT_INVENTORY_LIMIT,
      });
      if (requestId !== requestIdRef.current) return;
      if (txResult.failedCount > 0) {
        nextWarnings.push(`Không tải được giao dịch của ${txResult.failedCount} dòng tồn kho.`);
      }

      setTransactions(txResult.transactions);
      setWarnings(nextWarnings);
      setLastRefreshedAt(new Date());
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('Lỗi khi tải dữ liệu dashboard:', err);
      setError(err?.message || 'Không thể tải toàn bộ dữ liệu bảng điều khiển. Vui lòng thử lại.');
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const { products, warehouses, categories, inventories } = snapshot;

  const clientKpis = useMemo(
    () => calculateKpis(products, inventories, warehouses),
    [products, inventories, warehouses]
  );

  // Các chỉ số không có trong KPI API (giá trị kho, kho online...) vẫn lấy từ client nếu backend thiếu.
  const kpis = useMemo(() => {
    if (!backendKpis) return clientKpis;
    const defined = Object.fromEntries(
      Object.entries(backendKpis).filter(([, v]) => v !== null && v !== undefined)
    );
    return { ...clientKpis, ...defined };
  }, [backendKpis, clientKpis]);

  const categoryDistribution = useMemo(
    () => calculateCategoryDistribution(inventories, products, categories),
    [inventories, products, categories]
  );

  const warehouseStocks = useMemo(
    () => calculateWarehouseStock(inventories, warehouses),
    [inventories, warehouses]
  );

  const transactionBreakdown = useMemo(
    () => calculateTransactionBreakdown(transactions),
    [transactions]
  );

  const recentTransactions = useMemo(() => transactions.slice(0, 8), [transactions]);

  const clientAlerts = useMemo(
    () => buildStockAlerts(products, inventories, warehouses),
    [products, inventories, warehouses]
  );
  const allAlerts = backendAlerts ?? clientAlerts;
  const stockAlerts = useMemo(() => allAlerts.slice(0, DASHBOARD_ALERT_LIMIT), [allAlerts]);
  const alertSummary = useMemo(() => summarizeAlerts(allAlerts), [allAlerts]);

  const dataSource = {
    kpis: backendKpis ? 'backend' : 'client',
    alerts: backendAlerts ? 'backend' : 'client',
  };

  return {
    isLoading,
    error,
    warnings,
    lastRefreshedAt,
    kpis,
    categoryDistribution,
    warehouseStocks,
    transactionBreakdown,
    recentTransactions,
    stockAlerts,
    alertSummary,
    dataSource,
    refetch: fetchDashboardData,
  };
}
