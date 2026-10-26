export default function ForecastErrorBanner({ errorInfo, onRetry }) {
  if (!errorInfo) return null;

  const { kind, title, message, hint, retryable } = errorInfo;

  const toneConfig = {
    offline: {
      border: 'border-rose-200',
      bg: 'bg-rose-50/70',
      text: 'text-rose-950',
      icon: 'cloud_off',
      iconColor: 'text-rose-600',
    },
    timeout: {
      border: 'border-amber-200',
      bg: 'bg-amber-50/70',
      text: 'text-amber-950',
      icon: 'hourglass_empty',
      iconColor: 'text-amber-600',
    },
    invalid: {
      border: 'border-orange-200',
      bg: 'bg-orange-50/70',
      text: 'text-orange-950',
      icon: 'warning',
      iconColor: 'text-orange-600',
    },
    validation: {
      border: 'border-amber-200',
      bg: 'bg-amber-50/70',
      text: 'text-amber-950',
      icon: 'fact_check',
      iconColor: 'text-amber-600',
    },
    server: {
      border: 'border-rose-200',
      bg: 'bg-rose-50/70',
      text: 'text-rose-950',
      icon: 'dns',
      iconColor: 'text-rose-600',
    },
    unknown: {
      border: 'border-slate-200',
      bg: 'bg-slate-100',
      text: 'text-slate-900',
      icon: 'error',
      iconColor: 'text-slate-600',
    },
  };

  const style = toneConfig[kind] || toneConfig.unknown;

  return (
    <div
      role="alert"
      className={`forecast-fade-in flex flex-col sm:flex-row items-start justify-between gap-4 rounded-2xl border ${style.border} ${style.bg} p-5 ${style.text} shadow-sm`}
    >
      <div className="flex items-start gap-3.5">
        <div className="mt-0.5 rounded-xl bg-white/80 p-2 shadow-xs">
          <span className={`material-symbols-outlined text-2xl ${style.iconColor}`}>{style.icon}</span>
        </div>
        <div>
          <h3 className="font-semibold text-base leading-snug">{title}</h3>
          <p className="mt-1 text-sm opacity-90 leading-relaxed">{message}</p>
          {hint && (
            <p className="mt-2 text-xs opacity-75 bg-white/60 rounded-lg px-2.5 py-1.5 inline-block font-mono">
              💡 {hint}
            </p>
          )}
        </div>
      </div>

      {retryable && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold shadow-xs border border-slate-200 transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-95"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Thử lại
        </button>
      )}
    </div>
  );
}
