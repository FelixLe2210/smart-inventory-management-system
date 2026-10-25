import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReports } from '../../hooks/useReports';
import TransactionReportPanel from './TransactionReportPanel';
import InventoryReportPanel from './InventoryReportPanel';

const TABS = [
  { key: 'inventory', label: 'Báo cáo tồn kho', icon: 'inventory_2' },
  { key: 'transactions', label: 'Báo cáo giao dịch', icon: 'receipt_long' },
];

/**
 * ReportsPage - Báo cáo & Phân tích (/reports)
 * Sprint 6 - M4 (Sprint6-14: Report UI)
 */
export default function ReportsPage() {
  const reports = useReports();
  const [tab, setTab] = useState('inventory');

  return (
    <div className="flex flex-col w-full">
      <div className="w-full px-margin pt-space-md bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-space-md">
          <div className="flex flex-col gap-0.5">
            <nav aria-label="Breadcrumb" className="flex items-center gap-space-xs text-secondary font-label-default text-label-default">
              <Link to="/dashboard" className="hover:text-primary transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">home</span>
                <span>Bàn làm việc</span>
              </Link>
              <span className="text-outline-variant">/</span>
              <span className="text-on-surface font-body-sm-medium">Báo cáo & Phân tích</span>
            </nav>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">
              Báo cáo Kho vận
            </h1>
          </div>
          <div className="flex items-center gap-space-sm">
            {reports.lastRefreshedAt && (
              <span className="text-[11px] text-secondary">
                Cập nhật {reports.lastRefreshedAt.toLocaleTimeString('vi-VN')}
              </span>
            )}
            <button
              type="button"
              onClick={reports.refetch}
              disabled={reports.isLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-surface-container-high transition-colors disabled:opacity-60"
            >
              <span className={`material-symbols-outlined text-[18px] ${reports.isLoading ? 'animate-spin' : ''}`}>sync</span>
              <span>{reports.isLoading ? 'Đang tải...' : 'Làm mới'}</span>
            </button>
          </div>
        </div>

        <div role="tablist" className="flex gap-1 mt-space-md">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-secondary hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full px-margin py-space-lg flex flex-col gap-space-lg">
        {reports.loadError && (
          <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {reports.loadError}
            </span>
            <button type="button" onClick={reports.refetch} className="font-semibold underline">Thử lại</button>
          </div>
        )}
        {reports.warning && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">info</span>
            <span>{reports.warning}</span>
          </div>
        )}

        {tab === 'inventory' ? (
          <InventoryReportPanel reports={reports} />
        ) : (
          <TransactionReportPanel reports={reports} />
        )}
      </div>
    </div>
  );
}
