import React from 'react';

export const fmtNumber = (n) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0);
export const fmtCurrency = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(n) || 0);

export function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Thẻ số liệu tổng hợp của báo cáo. */
export function ReportStat({ label, value, hint, tone = 'text-on-surface' }) {
  return (
    <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
      <div className="text-[11px] uppercase tracking-wider text-secondary font-semibold">{label}</div>
      <div className={`text-xl font-bold mt-1 ${tone}`}>{value}</div>
      {hint && <div className="text-[11px] text-secondary mt-0.5">{hint}</div>}
    </div>
  );
}

/** Khung bộ lọc dùng chung cho cả hai báo cáo. */
export function FilterPanel({ children, onReset, hasActiveFilter }) {
  return (
    <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm border border-outline-variant flex items-end gap-3 flex-wrap">
      {children}
      {hasActiveFilter && (
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 h-10 px-3 rounded-xl border border-outline-variant text-secondary hover:text-on-surface hover:bg-surface-container transition-colors font-body-sm text-body-sm"
        >
          <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
          <span>Đặt lại</span>
        </button>
      )}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-semibold text-secondary uppercase tracking-wider">
      {label}
      {children}
    </label>
  );
}

export const controlClass =
  'h-10 px-3 rounded-xl border border-outline-variant bg-surface text-on-surface font-body-sm text-body-sm normal-case tracking-normal font-normal outline-none focus:border-primary';

export function ExportButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-primary text-on-primary font-body-sm-medium text-body-sm-medium hover:bg-primary-container transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="material-symbols-outlined text-[18px]">download</span>
      <span>Xuất CSV</span>
    </button>
  );
}
