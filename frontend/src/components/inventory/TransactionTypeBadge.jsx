import React from 'react';

export const TRANSACTION_TYPES = {
  RECEIVING: {
    label: 'Nhập kho',
    english: 'Receiving',
    icon: 'south_west',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    color: 'text-emerald-700',
    sign: '+',
  },
  ISSUING: {
    label: 'Xuất kho',
    english: 'Issuing',
    icon: 'north_east',
    badge: 'bg-red-50 text-red-700 border-red-200',
    color: 'text-red-700',
    sign: '-',
  },
  TRANSFER_IN: {
    label: 'Chuyển đến',
    english: 'Transfer In',
    icon: 'move_to_inbox',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    color: 'text-sky-700',
    sign: '+',
  },
  TRANSFER_OUT: {
    label: 'Chuyển đi',
    english: 'Transfer Out',
    icon: 'outbox',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    color: 'text-amber-700',
    sign: '-',
  },
  ADJUSTMENT: {
    label: 'Điều chỉnh kiểm kê',
    english: 'Adjustment',
    icon: 'tune',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    color: 'text-purple-700',
    sign: '±',
  },
};

export default function TransactionTypeBadge({ type, size = 'md' }) {
  const config = TRANSACTION_TYPES[type] || {
    label: type || 'Khác',
    english: 'Other',
    icon: 'swap_horiz',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    color: 'text-slate-700',
    sign: '',
  };

  const isSmall = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1 font-body-sm-medium rounded-full border ${config.badge} ${
        isSmall ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-label-sm'
      }`}
    >
      <span className={`material-symbols-outlined ${isSmall ? 'text-[14px]' : 'text-[16px]'}`}>
        {config.icon}
      </span>
      <span>{config.label}</span>
    </span>
  );
}
