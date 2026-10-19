import React from 'react';

/**
 * DataSourceBadge - Cho biết số liệu đang lấy từ Backend API hay tính tại client.
 * Hữu ích khi nghiệm thu (Sprint6-16) và khi API tổng hợp của backend chưa sẵn sàng.
 */
export default function DataSourceBadge({ source, label = 'Nguồn số liệu' }) {
  const isBackend = source === 'backend';
  return (
    <span
      title={
        isBackend
          ? 'Số liệu do API tổng hợp của backend trả về'
          : 'API tổng hợp của backend chưa sẵn sàng — số liệu được tính từ dữ liệu tồn kho/sản phẩm'
      }
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${
        isBackend
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-slate-100 text-slate-600 border-slate-200'
      }`}
    >
      <span className="material-symbols-outlined text-[14px]">{isBackend ? 'cloud_done' : 'computer'}</span>
      <span>
        {label}: {isBackend ? 'Backend API' : 'Tính tại client'}
      </span>
    </span>
  );
}
