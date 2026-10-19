import React from 'react';
import { Link } from 'react-router-dom';
import { useStockAlerts } from '../../hooks/useStockAlerts';
import { ALERT_TYPES } from '../../utils/stockAlerts';
import DataSourceBadge from '../../components/common/DataSourceBadge';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0);

/**
 * AlertsPage - Cảnh báo tồn kho (/alerts)
 * Sprint 6 - M4 (Sprint6-13: Alert UI — hiển thị low-stock / out-of-stock alerts)
 */
export default function AlertsPage() {
  const a = useStockAlerts();

  return (
    <div className="flex flex-col w-full">
      {/* Header */}
      <div className="w-full px-margin py-space-md flex flex-col md:flex-row md:items-center md:justify-between gap-space-md bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col gap-0.5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-space-xs text-secondary font-label-default text-label-default">
            <Link to="/dashboard" className="hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">home</span>
              <span>Bàn làm việc</span>
            </Link>
            <span className="text-outline-variant">/</span>
            <span className="text-on-surface font-body-sm-medium">Cảnh báo tồn kho</span>
          </nav>
          <div className="flex items-center gap-space-sm mt-1 flex-wrap">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              Cảnh báo Tồn kho
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-body-sm-medium ${
                a.summary.total > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {a.summary.total} cảnh báo
            </span>
            <DataSourceBadge source={a.dataSource} />
          </div>
        </div>

        <div className="flex items-center gap-space-sm flex-wrap">
          {a.lastRefreshedAt && (
            <span className="text-[11px] text-secondary">
              Cập nhật {a.lastRefreshedAt.toLocaleTimeString('vi-VN')}
            </span>
          )}
          <button
            type="button"
            onClick={a.refetch}
            disabled={a.isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-surface-container-high transition-colors disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[18px] ${a.isLoading ? 'animate-spin' : ''}`}>sync</span>
            <span>{a.isLoading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
          <Link
            to="/inbound"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">move_to_inbox</span>
            <span>Nhập kho</span>
          </Link>
        </div>
      </div>

      <div className="w-full px-margin py-space-lg flex flex-col gap-space-lg">
        {a.loadError && (
          <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {a.loadError}
            </span>
            <button type="button" onClick={a.refetch} className="font-semibold underline">Thử lại</button>
          </div>
        )}
        {a.warning && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">info</span>
            <span>{a.warning}</span>
          </div>
        )}

        {/* Summary cards — bấm để lọc nhanh */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            label="Tất cả cảnh báo"
            value={a.summary.total}
            icon="notifications"
            tone="bg-slate-50 text-slate-600"
            active={a.filterType === 'all'}
            onClick={() => a.setFilterType('all')}
          />
          <SummaryCard
            label="Hết hàng (Out of Stock)"
            value={a.summary.outOfStock}
            icon="error"
            tone="bg-red-50 text-red-600"
            active={a.filterType === 'OUT_OF_STOCK'}
            onClick={() => a.setFilterType('OUT_OF_STOCK')}
          />
          <SummaryCard
            label="Sắp hết hàng (Low Stock)"
            value={a.summary.lowStock}
            icon="warning"
            tone="bg-amber-50 text-amber-600"
            active={a.filterType === 'LOW_STOCK'}
            onClick={() => a.setFilterType('LOW_STOCK')}
          />
        </div>

        {/* Filter bar */}
        <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm border border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-secondary text-[20px]">search</span>
            <input
              type="text"
              aria-label="Tìm theo tên hoặc SKU"
              placeholder="Tìm theo tên sản phẩm hoặc SKU..."
              value={a.search}
              onChange={(e) => a.setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-xl border border-outline-variant bg-surface text-on-surface font-body-sm text-body-sm outline-none focus:border-primary transition-colors"
            />
          </div>
          {a.hasActiveFilter && (
            <button
              type="button"
              onClick={a.resetFilters}
              className="flex items-center gap-1 h-10 px-3 rounded-xl border border-outline-variant text-secondary hover:text-on-surface hover:bg-surface-container transition-colors font-body-sm text-body-sm"
            >
              <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
              <span>Đặt lại</span>
            </button>
          )}
        </div>

        {/* Alert table */}
        <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-sm overflow-hidden">
          {a.isLoading && a.alerts.length === 0 ? (
            <div className="p-10 text-center text-secondary text-sm">Đang tải cảnh báo...</div>
          ) : a.alerts.length === 0 ? (
            <EmptyState hasFilter={a.hasActiveFilter} hasAny={a.summary.total > 0} onReset={a.resetFilters} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-secondary text-[11px] uppercase tracking-wider">
                    <th className="px-4 py-3 font-semibold">Mức độ</th>
                    <th className="px-4 py-3 font-semibold">Sản phẩm</th>
                    <th className="px-4 py-3 font-semibold min-w-[180px]">Khả dụng / Tối thiểu</th>
                    <th className="px-4 py-3 font-semibold text-right">Thiếu hụt</th>
                    <th className="px-4 py-3 font-semibold">Theo kho</th>
                    <th className="px-4 py-3 font-semibold text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {a.alerts.map((alert) => (
                    <AlertRow key={alert.id} alert={alert} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, tone, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`text-left p-4 rounded-xl border bg-surface-container-lowest shadow-sm hover:shadow-md transition-all flex items-center justify-between ${
        active ? 'border-primary ring-1 ring-primary/30' : 'border-outline-variant/30'
      }`}
    >
      <div>
        <div className="text-[11px] uppercase tracking-wider text-secondary font-semibold">{label}</div>
        <div className="text-2xl font-bold text-on-surface mt-1">{fmt(value)}</div>
      </div>
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${tone}`}>
        <span className="material-symbols-outlined text-[24px]">{icon}</span>
      </span>
    </button>
  );
}

function AlertRow({ alert }) {
  const cfg = ALERT_TYPES[alert.type];
  // Thanh tiến độ: khả dụng so với ngưỡng tối thiểu (tối đa 100%)
  const pct = alert.minStock > 0 ? Math.min(100, Math.round((alert.available / alert.minStock) * 100)) : 0;
  const product = alert.product || {};

  return (
    <tr className="hover:bg-slate-50/60 transition-colors align-middle">
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-semibold ${cfg.badge}`}>
          <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
          {cfg.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-semibold text-on-surface">{product.name || '—'}</div>
        <div className="text-[11px] font-mono text-slate-500 mt-0.5">{product.sku || '—'}</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className={`font-semibold ${cfg.text}`}>{fmt(alert.available)}</span>
          <span className="text-secondary">/ {fmt(alert.minStock)}</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
          <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${pct}%` }} />
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <span className={`text-sm font-semibold ${alert.shortage > 0 ? cfg.text : 'text-secondary'}`}>
          {alert.shortage > 0 ? `-${fmt(alert.shortage)}` : '—'}
        </span>
      </td>
      <td className="px-4 py-3">
        {alert.warehouses.length === 0 ? (
          <span className="text-[11px] text-secondary">Chưa có tồn tại kho nào</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {alert.warehouses.map((w) => (
              <span
                key={w.warehouseId}
                title={w.name}
                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium"
              >
                {w.code}: {fmt(w.available)}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <Link
          to={`/inventory?productId=${product.id}`}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-secondary hover:text-on-surface rounded-md hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">visibility</span>
          Xem tồn
        </Link>
        <Link
          to="/inbound"
          className="ml-1 inline-flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-medium rounded-md transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">add_shopping_cart</span>
          Nhập hàng
        </Link>
      </td>
    </tr>
  );
}

function EmptyState({ hasFilter, hasAny, onReset }) {
  if (hasFilter && hasAny) {
    return (
      <div className="p-10 text-center">
        <span className="material-symbols-outlined text-secondary text-[36px]">search_off</span>
        <p className="text-sm text-on-surface mt-2">Không có cảnh báo nào khớp bộ lọc.</p>
        <button type="button" onClick={onReset} className="mt-2 text-xs text-primary font-semibold underline">
          Đặt lại bộ lọc
        </button>
      </div>
    );
  }
  return (
    <div className="p-10 text-center">
      <span className="material-symbols-outlined text-emerald-500 text-[40px]">check_circle</span>
      <h3 className="text-sm font-semibold text-on-surface mt-2">Kho hàng ổn định</h3>
      <p className="text-xs text-secondary mt-1">
        Hiện không có sản phẩm nào hết hàng hoặc chạm ngưỡng tồn tối thiểu.
      </p>
    </div>
  );
}
