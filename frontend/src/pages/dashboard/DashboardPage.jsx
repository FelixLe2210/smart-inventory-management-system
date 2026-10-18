import React from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../../hooks/useDashboard';
import KpiGrid from './KpiGrid';
import InventoryCharts from './InventoryCharts';
import RecentTransactions from './RecentTransactions';
import StockAlertList from './StockAlertList';

/**
 * DashboardPage - Bàn làm việc & Tổng quan quản trị kho
 * Sprint 6 - Milestone M3 (Frontend Dashboard & Visualizations)
 *   - Sprint6-09: Dashboard Layout
 *   - Sprint6-10: KPI Cards (Products, stock, low stock, out of stock)
 *   - Sprint6-11: Inventory Charts (Tồn kho theo chi nhánh, phân bổ danh mục, biến động)
 *   - Sprint6-12: Recent Transactions UI (Hiển thị giao dịch kho mới nhất)
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
    refetch,
  } = useDashboard();

  return (
    <div className="flex flex-col w-full min-h-full">
      {/* ── Top Header & Quick Actions Bar ── */}
      <div className="w-full px-margin py-space-md flex flex-col md:flex-row md:items-center md:justify-between gap-space-md bg-surface-container-lowest shadow-sm border-b border-outline-variant/20">
        <div>
          <div className="flex items-center gap-space-xs text-secondary text-xs">
            <span className="material-symbols-outlined text-[16px]">dashboard</span>
            <span>Điều hành chung</span>
            <span className="text-outline-variant">/</span>
            <span className="text-on-surface font-medium">Bàn làm việc (Dashboard)</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-xl md:text-2xl font-bold text-on-surface tracking-tight">
              Tổng quan Vận hành Kho vận
            </h1>
          </div>
        </div>

        {/* Quick actions buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={refetch}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-container text-on-surface text-xs font-semibold rounded-lg hover:bg-surface-container-high transition-colors"
          >
            <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>{isLoading ? 'Đang cập nhật...' : 'Làm mới'}</span>
          </button>

          <Link
            to="/inbound"
            className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">move_to_inbox</span>
            <span>Nhập kho</span>
          </Link>

          <Link
            to="/outbound"
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">unarchive</span>
            <span>Xuất kho</span>
          </Link>

          <Link
            to="/transfer"
            className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">sync_alt</span>
            <span>Chuyển kho</span>
          </Link>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="p-margin flex-1 flex flex-col">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Sprint6-10: KPI Cards Grid */}
        <KpiGrid kpis={kpis} />

        {/* Sprint6-11: Inventory Distribution & Charts */}
        <InventoryCharts
          warehouseStocks={warehouseStocks}
          categoryDistribution={categoryDistribution}
          transactionBreakdown={transactionBreakdown}
        />

        {/* Sprint6-12 & Alerts: Recent Transactions + Stock Warnings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentTransactions transactions={recentTransactions} isLoading={isLoading} />
          </div>
          <div className="lg:col-span-1">
            <StockAlertList alerts={stockAlerts} />
          </div>
        </div>
      </div>
    </div>
  );
}
