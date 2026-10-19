import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { dashboardApi, loadMasterSnapshot } from '../api/dashboardApi';
import {
  buildStockAlerts,
  filterAlerts,
  normalizeBackendAlerts,
  summarizeAlerts,
} from '../utils/stockAlerts';

/**
 * Hook useStockAlerts
 * Dữ liệu & bộ lọc cho trang Cảnh báo tồn kho (/alerts)
 * Sprint 6 - M4 (Sprint6-13: Alert UI, Sprint6-15: API Integration)
 */
export function useStockAlerts() {
  const [snapshot, setSnapshot] = useState({ products: [], warehouses: [], inventories: [] });
  const [backendAlerts, setBackendAlerts] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [warning, setWarning] = useState('');
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');

  const requestIdRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError('');
    setWarning('');

    try {
      const [snap, alertRes] = await Promise.allSettled([
        loadMasterSnapshot(),
        dashboardApi.getStockAlerts(),
      ]);
      if (requestId !== requestIdRef.current) return;

      if (snap.status === 'rejected') throw snap.reason;
      const data = snap.value;

      const warnings = [];
      if (data.failed.length > 0) {
        warnings.push(`Không tải được: ${data.failed.join(', ')}.`);
      }
      if (alertRes.status === 'rejected') {
        warnings.push('Alert API gặp lỗi — đang hiển thị cảnh báo tính từ dữ liệu tồn kho.');
      }

      setSnapshot({ products: data.products, warehouses: data.warehouses, inventories: data.inventories });
      setBackendAlerts(alertRes.status === 'fulfilled' ? normalizeBackendAlerts(alertRes.value) : null);
      setWarning(warnings.join(' '));
      setLastRefreshedAt(new Date());
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setLoadError(err?.message || 'Không thể tải dữ liệu cảnh báo tồn kho.');
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const clientAlerts = useMemo(
    () => buildStockAlerts(snapshot.products, snapshot.inventories, snapshot.warehouses),
    [snapshot]
  );
  const allAlerts = backendAlerts ?? clientAlerts;

  const summary = useMemo(() => summarizeAlerts(allAlerts), [allAlerts]);
  const alerts = useMemo(
    () => filterAlerts(allAlerts, { type: filterType, search }),
    [allAlerts, filterType, search]
  );

  const hasActiveFilter = filterType !== 'all' || !!search;
  const resetFilters = useCallback(() => {
    setFilterType('all');
    setSearch('');
  }, []);

  return {
    alerts,
    summary,
    isLoading,
    loadError,
    warning,
    lastRefreshedAt,
    dataSource: backendAlerts ? 'backend' : 'client',
    filterType,
    setFilterType,
    search,
    setSearch,
    hasActiveFilter,
    resetFilters,
    refetch: fetchAll,
  };
}
