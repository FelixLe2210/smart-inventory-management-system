import { Link } from 'react-router-dom';

const SEGMENTS = [
  { key: 'okCount', label: 'Đủ hàng', bar: 'bg-emerald-500', dot: 'bg-emerald-500', to: '/inventory' },
  { key: 'lowStockCount', label: 'Sắp hết', bar: 'bg-amber-400', dot: 'bg-amber-400', to: '/inventory?status=LOW_STOCK' },
  { key: 'outOfStockCount', label: 'Hết hàng', bar: 'bg-red-500', dot: 'bg-red-500', to: '/inventory?status=OUT_OF_STOCK' },
];

/** Dải sức khỏe tồn kho: mã hàng đang ở trạng thái nào, bấm vào từng đoạn để xem danh sách. */
export default function StockHealthStrip({ kpis, isLoading }) {
  if (!kpis) return null;
  const total = kpis.trackedCount || 0;
  const pct = total ? Math.round((kpis.okCount / total) * 100) : 0;

  return (
    <section
      aria-label="Sức khỏe tồn kho"
      className="mb-6 rounded-xl border border-outline-variant/60 bg-surface-container-lowest shadow-card px-6 py-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 mb-4">
        <div>
          <p className="text-[13px] text-secondary font-medium">Sức khỏe tồn kho</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-[34px] leading-none font-bold tracking-tight text-on-surface">{pct}%</span>
            <span className="text-[14px] text-on-surface-variant">
              mã hàng đủ hàng ({kpis.okCount}/{total})
            </span>
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-1.5">
          {SEGMENTS.map((seg) => (
            <li key={seg.key}>
              <Link to={seg.to} className="group flex items-center gap-2 text-[13px] text-on-surface-variant hover:text-on-surface">
                <span className={`w-2.5 h-2.5 rounded-sm ${seg.dot}`} aria-hidden="true" />
                {seg.label}
                <span className="font-semibold text-on-surface group-hover:underline">{kpis[seg.key] || 0}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div
        className={`flex h-3 w-full gap-0.5 rounded-full overflow-hidden bg-surface-container ${isLoading ? 'opacity-60' : ''}`}
        role="img"
        aria-label={`${kpis.okCount} mã đủ hàng, ${kpis.lowStockCount} sắp hết, ${kpis.outOfStockCount} hết hàng`}
      >
        {total === 0 ? null : SEGMENTS.map((seg) => {
          const value = kpis[seg.key] || 0;
          if (!value) return null;
          return (
            <Link
              key={seg.key}
              to={seg.to}
              title={`${seg.label}: ${value}`}
              className={`${seg.bar} h-full transition-[width] duration-500 hover:brightness-110 first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${(value / total) * 100}%` }}
            />
          );
        })}
      </div>
    </section>
  );
}
