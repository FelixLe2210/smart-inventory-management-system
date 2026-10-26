export default function ForecastSkeleton() {
  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Skeleton summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="forecast-skeleton flex items-start gap-4 rounded-2xl border border-outline-variant/20 p-5 shadow-sm"
          >
            <div className="h-11 w-11 rounded-xl bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 rounded bg-slate-200" />
              <div className="h-5 w-1/2 rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </section>

      {/* Skeleton chart area */}
      <section className="forecast-skeleton rounded-2xl border border-outline-variant/20 p-6 shadow-sm min-h-[360px] flex flex-col justify-between">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <div className="h-4 w-40 rounded bg-slate-200" />
            <div className="h-3 w-64 rounded bg-slate-200" />
          </div>
          <div className="h-4 w-32 rounded bg-slate-200" />
        </div>
        <div className="flex-1 w-full bg-slate-100/60 rounded-xl flex items-center justify-center">
          <div className="flex items-center gap-2 text-secondary text-sm font-medium">
            <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
            <span>Mô hình AI đang phân tích dữ liệu chuỗi thời gian & tính toán dự báo...</span>
          </div>
        </div>
      </section>
    </div>
  );
}
