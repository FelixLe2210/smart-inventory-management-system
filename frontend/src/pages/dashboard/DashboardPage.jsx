import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../../hooks/useDashboard';
import KpiGrid from './KpiGrid';
import StockHealthStrip from './StockHealthStrip';
import { useRealtime } from '../../realtime/RealtimeProvider';
import InventoryCharts from './InventoryCharts';
import RecentTransactions from './RecentTransactions';
import StockAlertList from './StockAlertList';
import DataSourceBadge from '../../components/common/DataSourceBadge';

/**
 * DashboardPage - Bàn làm việc & Tổng quan quản trị kho
 *   - Dashboard Layout
 *   - KPI Cards (Products, stock, low stock, out of stock)
 *   - Inventory Charts (Tồn kho theo chi nhánh, phân bổ danh mục, biến động)
 *   - Recent Transactions UI (Hiển thị giao dịch kho mới nhất)
 *   - danh sách cảnh báo liên kết sang trang /alerts
 *   - Dashboard API Integration (KPI API + Alert API, fallback tính tại client)
 */
export default function DashboardPage() {
  const {
    isLoading,
    error,
    lastRefreshedAt,
    kpis,
    categoryDistribution,
    warehouseStocks,
    transactionBreakdown,
    recentTransactions,
    stockAlerts,
    alertSummary,
    warnings,
    dataSource,
    refetch,
  } = useDashboard();

  // Tồn kho đổi ở nơi khác: nạp lại số liệu (gộp các thay đổi liên tiếp trong 1,5 giây).
  const { subscribe } = useRealtime();
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  useEffect(() => {
    let timer = null;
    const unsubscribe = subscribe((msg) => {
      if (msg.type !== 'INVENTORY_UPDATED') return;
      clearTimeout(timer);
      timer = setTimeout(() => refetchRef.current(), 1500);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [subscribe]);

  return (
    <div className="flex flex-col w-full min-h-full">
      {/* ── Thanh thao tác nhanh (tiêu đề trang nằm ở header) ── */}
      <div className="w-full px-margin py-3 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/50 bg-surface-container-lowest">
        <p className="text-[13px] text-secondary flex items-center gap-2">
          {lastRefreshedAt ? `Cập nhật lúc ${lastRefreshedAt.toLocaleTimeString('vi-VN')}` : 'Đang tải số liệu...'}
          <DataSourceBadge source={dataSource.kpis} label="KPI" />
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={refetch}
            disabled={isLoading}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-outline-variant text-on-surface text-[13px] font-medium hover:bg-surface-container-low transition-colors"
          >
            <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
            {isLoading ? 'Đang cập nhật...' : 'Làm mới'}
          </button>
          <Link to="/inbound" className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-on-primary text-[13px] font-semibold hover:brightness-110 transition">
            <span className="material-symbols-outlined text-[18px]">move_to_inbox</span>Nhập kho
          </Link>
          <Link to="/outbound" className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-outline-variant text-on-surface text-[13px] font-medium hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-[18px]">outbox</span>Xuất kho
          </Link>
          <Link to="/transfer" className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-outline-variant text-on-surface text-[13px] font-medium hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-[18px]">swap_horiz</span>Chuyển kho
          </Link>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="p-margin flex-1 flex flex-col">
        {error && (
          <div role="alert" className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </span>
            <button type="button" onClick={refetch} className="font-semibold underline">Thử lại</button>
          </div>
        )}
        {warnings.length > 0 && (
          <div className="mb-6 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex flex-col gap-1">
            {warnings.map((w) => (
              <span key={w} className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">info</span>
                <span>{w}</span>
              </span>
            ))}
          </div>
        )}

        <StockHealthStrip kpis={kpis} isLoading={isLoading} />

        {/* KPI Cards Grid */}
        <KpiGrid kpis={kpis} />

        {/* Inventory Distribution & Charts */}
        <InventoryCharts
          warehouseStocks={warehouseStocks}
          categoryDistribution={categoryDistribution}
          transactionBreakdown={transactionBreakdown}
        />

        {/* Recent Transactions + Stock Warnings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentTransactions transactions={recentTransactions} isLoading={isLoading} />
          </div>
          <div className="lg:col-span-1">
            <StockAlertList alerts={stockAlerts} totalCount={alertSummary.total} />
          </div>
        </div>
      </div>
    </div>
  );
}
