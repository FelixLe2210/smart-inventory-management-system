import { rateMape, accuracyPercent } from '../../utils/forecast';

function formatMetric(value, digits = 2, suffix = '') {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'Chưa có';
  }
  return `${new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)}${suffix}`;
}

export default function ModelAccuracyCard({ modelInfo, isLoading, error, onReload }) {
  if (isLoading) {
    return (
      <div className="forecast-skeleton rounded-2xl border border-outline-variant/30 p-5 shadow-sm sm:p-6 min-h-[160px]">
        <div className="h-5 w-44 rounded bg-slate-200 mb-4" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="h-14 rounded bg-slate-200" />
          <div className="h-14 rounded bg-slate-200" />
          <div className="h-14 rounded bg-slate-200" />
          <div className="h-14 rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-amber-600 text-xl">info</span>
          <span>Không thể tải thông số mô hình AI: {error}</span>
        </div>
        {onReload && (
          <button
            type="button"
            onClick={onReload}
            className="shrink-0 font-medium text-amber-800 underline hover:text-amber-950 text-xs"
          >
            Thử lại
          </button>
        )}
      </div>
    );
  }

  if (!modelInfo) return null;

  const { metrics, algorithm, modelName, version, trainedAt, isLoaded } = modelInfo;
  const mapeRating = rateMape(metrics?.mape);
  const accPct = accuracyPercent(metrics?.mape);

  const toneBadges = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    red: 'border-rose-200 bg-rose-50 text-rose-800',
    slate: 'border-slate-200 bg-slate-100 text-slate-700',
  };

  return (
    <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm sm:p-6 forecast-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-on-surface">Độ chính xác & Thông số mô hình</h2>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                toneBadges[mapeRating.tone] || toneBadges.slate
              }`}
            >
              <span className="material-symbols-outlined text-sm">verified</span>
              {mapeRating.label}
            </span>
          </div>
        </div>

        {accPct !== null && (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2">
            <div className="text-right">
              <span className="block text-[11px] text-secondary font-medium">Độ khớp ước lượng</span>
              <span className="text-base font-bold text-primary">{formatMetric(accPct, 1, '%')}</span>
            </div>
            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, accPct))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricBox
          label="MAPE (Sai số % TB)"
          value={formatMetric(metrics?.mape, 2, '%')}
          sublabel="Thấp hơn là tốt hơn"
          highlight={metrics?.mape !== null}
        />
        <MetricBox
          label="MAE (Sai số tuyệt đối TB)"
          value={formatMetric(metrics?.mae, 2)}
          sublabel="Đơn vị sản phẩm / ngày"
        />
        <MetricBox
          label="RMSE (Căn bậc hai MSE)"
          value={formatMetric(metrics?.rmse, 2)}
          sublabel="Nhạy với đột biến lớn"
        />
        <MetricBox
          label="R² (Hệ số xác định)"
          value={formatMetric(metrics?.r2, 3)}
          sublabel="Gần 1.0 giải thích tốt"
        />
      </div>
    </section>
  );
}

function MetricBox({ label, value, sublabel, highlight }) {
  return (
    <div
      className={`rounded-xl border p-3.5 transition-all ${
        highlight
          ? 'border-primary/20 bg-primary/[0.02]'
          : 'border-outline-variant/20 bg-surface-container-low/40'
      }`}
    >
      <span className="text-xs font-medium text-secondary block line-clamp-1">{label}</span>
      <span className="text-lg font-bold text-on-surface mt-1 block">{value}</span>
      {sublabel && <span className="text-[11px] text-slate-500 mt-0.5 block">{sublabel}</span>}
    </div>
  );
}
