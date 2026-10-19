import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { dashboardApi, loadMasterSnapshot, loadTransactionsForInventories } from '../api/dashboardApi';
import {
  buildInventoryReport,
  buildTransactionReport,
  isValidInventoryReport,
  isValidTransactionReport,
} from '../utils/reports';

export const DEFAULT_TX_FILTERS = { from: '', to: '', type: 'all', warehouseId: 'all', productId: 'all' };
export const DEFAULT_INV_FILTERS = { warehouseId: 'all', categoryId: 'all', status: 'all', search: '' };

/**
 * Hook useReports
 * Dữ liệu & bộ lọc cho trang Báo cáo (/reports): báo cáo giao dịch + báo cáo tồn kho.
 * Sprint 6 - M4 (Sprint6-14: Report UI, Sprint6-15: API Integration)
 *
 * Với mỗi báo cáo: thử gọi Report API của backend theo bộ lọc; nếu chưa có (hoặc sai contract)
 * thì dựng báo cáo từ dữ liệu tồn kho/giao dịch đã nạp.
 */
export function useReports() {
  const [master, setMaster] = useState({ products: [], warehouses: [], categories: [], inventories: [] });
  const [transactions, setTransactions] = useState([]);
  const [txMeta, setTxMeta] = useState({ failedCount: 0 });

  const [txFilters, setTxFilters] = useState(DEFAULT_TX_FILTERS);
  const [invFilters, setInvFilters] = useState(DEFAULT_INV_FILTERS);

  const [backendTxReport, setBackendTxReport] = useState(null);
  const [backendInvReport, setBackendInvReport] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [warning, setWarning] = useState('');
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  const requestIdRef = useRef(0);
  const reportRequestIdRef = useRef(0);

  // ── Nạp dữ liệu nền + toàn bộ giao dịch ──
  const fetchBase = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError('');
    setWarning('');
    try {
      const data = await loadMasterSnapshot();
      if (requestId !== requestIdRef.current) return;

      const txResult = await loadTransactionsForInventories(data.inventories, {
        products: data.products,
        warehouses: data.warehouses,
      });
      if (requestId !== requestIdRef.current) return;

      const warnings = [];
      if (data.failed.length > 0) warnings.push(`Không tải được: ${data.failed.join(', ')}.`);
      if (txResult.failedCount > 0) {
        warnings.push(`Không tải được giao dịch của ${txResult.failedCount} dòng tồn kho — báo cáo giao dịch có thể thiếu.`);
      }

      setMaster({
        products: data.products,
        warehouses: data.warehouses,
        categories: data.categories,
        inventories: data.inventories,
      });
      setTransactions(txResult.transactions);
      setTxMeta({ failedCount: txResult.failedCount });
      setWarning(warnings.join(' '));
      setLastRefreshedAt(new Date());
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setLoadError(err?.message || 'Không thể tải dữ liệu báo cáo.');
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBase();
  }, [fetchBase]);

  // ── Thử Report API của backend mỗi khi đổi bộ lọc (debounce nhẹ) ──
  useEffect(() => {
    const requestId = ++reportRequestIdRef.current;
    const timer = setTimeout(async () => {
      const [tx, inv] = await Promise.allSettled([
        dashboardApi.getTransactionReport(txFilters),
        dashboardApi.getInventoryReport(invFilters),
      ]);
      if (requestId !== reportRequestIdRef.current) return;
      setBackendTxReport(tx.status === 'fulfilled' && isValidTransactionReport(tx.value) ? tx.value : null);
      setBackendInvReport(inv.status === 'fulfilled' && isValidInventoryReport(inv.value) ? inv.value : null);
    }, 250);
    return () => clearTimeout(timer);
  }, [txFilters, invFilters]);

  const clientTxReport = useMemo(
    () => buildTransactionReport(transactions, txFilters),
    [transactions, txFilters]
  );
  const clientInvReport = useMemo(
    () =>
      buildInventoryReport(
        master.inventories,
        master.products,
        master.categories,
        master.warehouses,
        invFilters
      ),
    [master, invFilters]
  );

  const updateTxFilter = useCallback((patch) => setTxFilters((f) => ({ ...f, ...patch })), []);
  const updateInvFilter = useCallback((patch) => setInvFilters((f) => ({ ...f, ...patch })), []);

  return {
    isLoading,
    loadError,
    warning,
    lastRefreshedAt,
    refetch: fetchBase,
    products: master.products,
    warehouses: master.warehouses,
    categories: master.categories,

    txFilters,
    updateTxFilter,
    resetTxFilters: () => setTxFilters(DEFAULT_TX_FILTERS),
    txReport: backendTxReport
      ? { ...clientTxReport, ...backendTxReport, byType: backendTxReport.byType || clientTxReport.byType }
      : clientTxReport,
    txSource: backendTxReport ? 'backend' : 'client',
    txFailedCount: txMeta.failedCount,

    invFilters,
    updateInvFilter,
    resetInvFilters: () => setInvFilters(DEFAULT_INV_FILTERS),
    invReport: backendInvReport || clientInvReport,
    invSource: backendInvReport ? 'backend' : 'client',
  };
}
