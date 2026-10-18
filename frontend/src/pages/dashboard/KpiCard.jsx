import React from 'react';

/**
 * KpiCard - Thẻ thống kê chỉ số hiệu suất
 * Sprint 6 - Milestone M3 (Sprint6-10)
 */
export default function KpiCard({
  title,
  value,
  subValue,
  icon,
  iconBgColor = 'bg-blue-50 text-blue-600',
  trend,
  trendLabel,
  badgeText,
  badgeType = 'default',
}) {
  const badgeStyles = {
    danger: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    default: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <span className="font-label-default text-xs uppercase tracking-wider text-secondary font-semibold">
            {title}
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-on-surface">
              {value}
            </span>
            {badgeText && (
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                  badgeStyles[badgeType] || badgeStyles.default
                }`}
              >
                {badgeText}
              </span>
            )}
          </div>
        </div>

        <div className={`p-3 rounded-xl flex items-center justify-center ${iconBgColor}`}>
          <span className="material-symbols-outlined text-[24px]">{icon}</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-secondary">
        <span className="truncate">{subValue}</span>
        {trend && (
          <span
            className={`font-medium flex items-center gap-0.5 ${
              trend > 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">
              {trend > 0 ? 'trending_up' : 'trending_down'}
            </span>
            <span>{trendLabel}</span>
          </span>
        )}
      </div>
    </div>
  );
}
