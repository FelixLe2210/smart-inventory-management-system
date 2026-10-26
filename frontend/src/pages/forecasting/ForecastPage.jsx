import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { productApi } from '../../api/productApi';
import { forecastApi } from '../../api/forecastApi';
import ForecastChart from './ForecastChart';
import ModelAccuracyCard from './ModelAccuracyCard';
import ForecastErrorBanner from './ForecastErrorBanner';
import ForecastSkeleton from './ForecastSkeleton';
import {
  FORECAST_HORIZONS,
  describeForecastError,
  summarizeForecast,
} from '../../utils/forecast';

function formatNumber(value, digits = 1) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(value);
}

function formatDateDisplay(dateStr) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${dateStr}T00:00:00Z`)
  );
}

export default function ForecastPage() {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [horizonDays, setHorizonDays] = useState(14);
  const [forecast, setForecast] = useState(null);

  // Trạng thái AI Model Metrics
  const [modelInfo, setModelInfo] = useState(null);
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [modelError, setModelError] = useState('');

  // Trạng thái tải danh sách sản phẩm
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState('');

  // Trạng thái thực thi dự báo
  const [isForecasting, setIsForecasting] = useState(false);
  const [forecastError, setForecastError] = useState(null);

  // Quản lý huỷ request nếu người dùng chọn lại hoặc chuyển tab
  const abortControllerRef = useRef(null);

  // Tải danh sách sản phẩm từ backend
  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    setProductsError('');
    try {
      const result = await productApi.getAll();
      if (!Array.isArray(result)) {
        throw new Error('Phản hồi danh sách sản phẩm không hợp lệ.');
      }
      const activeProducts = result
        .filter((product) => product.status === 'ACTIVE')
        .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
      setProducts(activeProducts);
      setSelectedProductId((currentId) =>
        activeProducts.some((p) => String(p.id) === String(currentId))
          ? currentId
          : activeProducts[0]?.id ? String(activeProducts[0].id) : ''
      );
    } catch (loadError) {
      setProductsError(loadError.message || 'Không thể tải danh sách sản phẩm.');
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  // Tải metadata & metrics của mô hình AI đang dùng
  const loadModelInfo = useCallback(async () => {
    setIsLoadingModel(true);
    setModelError('');
    try {
      const info = await forecastApi.getModelInfo();
      setModelInfo(info);
    } catch (err) {
      setModelError(err.message || 'Không thể kết nối AI service để lấy thông số mô hình.');
    } finally {
      setIsLoadingModel(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadModelInfo();
  }, [loadProducts, loadModelInfo]);

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id) === String(selectedProductId)),
    [products, selectedProductId]
  );

  const summary = useMemo(() => summarizeForecast(forecast), [forecast]);

  // Tạo dự báo
  const handleGenerateForecast = async (event) => {
    if (event) event.preventDefault();
    if (!selectedProductId) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsForecasting(true);
    setForecastError(null);
    setForecast(null);

    try {
      const result = await forecastApi.getForecast({
        productId: Number(selectedProductId),
        horizonDays,
        signal: controller.signal,
      });
      setForecast(result);
    } catch (err) {
      if (err.code === 'REQUEST_CANCELLED') return;
      const errorDesc = describeForecastError(err);
      setForecastError(errorDesc);
    } finally {
      setIsForecasting(false);
    }
  };

  const handleSelectionChange = (updateFn) => {
    setForecast(null);
    setForecastError(null);
    updateFn();
  };

  return (
    <div className="flex min-h-full w-full flex-col">
      <header className="border-b border-outline-variant/30 bg-surface-container-lowest px-5 py-5 shadow-sm sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs text-secondary">
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              <span>Dự báo & Đề xuất AI</span>
              <span className="text-outline-variant">/</span>
              <span className="font-medium text-on-surface">Dự báo nhu cầu</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">
              Dự báo nhu cầu sản phẩm
            </h1>
            <p className="mt-1 text-sm text-secondary">
              Ước tính nhu cầu tiêu thụ tương lai (7, 14 hoặc 30 ngày) để tối ưu hoá kế hoạch tồn kho.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            AI Demand Forecast (Sprint 8)
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 p-5 sm:p-8">
        {/* Sprint8-11: Model Accuracy Card */}
        <ModelAccuracyCard
          modelInfo={modelInfo}
          isLoading={isLoadingModel}
          error={modelError}
          onReload={loadModelInfo}
        />

        {/* Form thiết lập dự báo */}
        <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-on-surface">Thiết lập thông số dự báo</h2>
            <p className="mt-1 text-sm text-secondary">
              Chọn sản phẩm cần phân tích và số ngày dự báo tương ứng.
            </p>
          </div>

          <form
            onSubmit={handleGenerateForecast}
            className="grid grid-cols-1 items-end gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.8fr)_auto]"
          >
            <label className="flex flex-col gap-2 text-sm font-medium text-on-surface">
              Sản phẩm mục tiêu
              <select
                value={selectedProductId}
                onChange={(event) =>
                  handleSelectionChange(() => setSelectedProductId(event.target.value))
                }
                disabled={isLoadingProducts || isForecasting || products.length === 0}
                className="h-11 rounded-lg border border-outline-variant bg-white px-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-container-low"
              >
                {isLoadingProducts && <option value="">Đang tải danh mục sản phẩm...</option>}
                {!isLoadingProducts && products.length === 0 && (
                  <option value="">Không có sản phẩm nào đang hoạt động</option>
                )}
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-on-surface">
              Khoảng dự báo
              <select
                value={horizonDays}
                onChange={(event) =>
                  handleSelectionChange(() => setHorizonDays(Number(event.target.value)))
                }
                disabled={isForecasting}
                className="h-11 rounded-lg border border-outline-variant bg-white px-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {FORECAST_HORIZONS.map((days) => (
                  <option key={days} value={days}>
                    {days} ngày tới ({days === 7 ? '1 tuần' : days === 14 ? '2 tuần' : '1 tháng'})
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={!selectedProductId || isLoadingProducts || isForecasting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55 active:scale-95"
            >
              <span
                className={`material-symbols-outlined text-[19px] ${
                  isForecasting ? 'animate-spin' : ''
                }`}
              >
                {isForecasting ? 'progress_activity' : 'auto_awesome'}
              </span>
              {isForecasting ? 'Đang phân tích...' : 'Tạo dự báo'}
            </button>
          </form>

          {productsError && (
            <div
              role="alert"
              className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <span>{productsError}</span>
              <button type="button" onClick={loadProducts} className="font-semibold underline">
                Tải lại
              </button>
            </div>
          )}
        </section>

        {/* Sprint8-12: Error UI banner */}
        {forecastError && (
          <ForecastErrorBanner
            errorInfo={forecastError}
            onRetry={handleGenerateForecast}
          />
        )}

        {/* Sprint8-12: Loading Skeleton UI */}
        {isForecasting && <ForecastSkeleton />}

        {/* Sprint8-09: Forecast Results UI & Sprint8-10: Forecast Chart */}
        {!isForecasting && forecast && summary && (
          <div className="flex flex-col gap-5 forecast-fade-in">
            {/* KPI Summary Cards */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <SummaryCard
                label={`Tổng nhu cầu · ${summary.days} ngày`}
                value={`${formatNumber(summary.total)} ${selectedProduct?.unit || 'đơn vị'}`}
                sublabel={`${formatDateDisplay(forecast.startDate)} – ${formatDateDisplay(forecast.endDate)}`}
                icon="inventory_2"
                tone="blue"
              />
              <SummaryCard
                label="Nhu cầu trung bình / ngày"
                value={`${formatNumber(summary.dailyAverage)} ${selectedProduct?.unit || 'đơn vị'}`}
                sublabel="Mức tiêu thụ kỳ vọng mỗi ngày"
                icon="avg_pace"
                tone="violet"
              />
              <SummaryCard
                label="Ngày cao điểm nhất"
                value={`${formatNumber(summary.peak.predictedDemand)} ${selectedProduct?.unit || 'đơn vị'}`}
                sublabel={formatDateDisplay(summary.peak.date)}
                icon="trending_up"
                tone="green"
              />
              <SummaryCard
                label="Ngày thấp điểm nhất"
                value={`${formatNumber(summary.low.predictedDemand)} ${selectedProduct?.unit || 'đơn vị'}`}
                sublabel={formatDateDisplay(summary.low.date)}
                icon="trending_down"
                tone="amber"
              />
            </section>

            {/* Chi tiết biểu đồ & ghi chú mô hình */}
            <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-on-surface">Đồ thị dự báo nhu cầu theo ngày</h2>
                    {forecast.fallbackApplied && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                        Rule-based Fallback
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-secondary">
                    {selectedProduct?.name} · SKU: {selectedProduct?.sku} · Thời đoạn: {forecast.horizonDays} ngày
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-secondary">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-0.5 w-5 rounded bg-blue-600" />
                    Đường dự báo
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-0.5 w-5 rounded bg-purple-600 border-dashed border-t-2" />
                    Mức trung bình
                  </span>
                  {forecast.predictions.some((p) => p.lowerBound !== null && p.upperBound !== null) && (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-5 rounded bg-blue-200" />
                      Khoảng tin cậy 95%
                    </span>
                  )}
                </div>
              </div>

              {/* Chart component */}
              <ForecastChart
                predictions={forecast.predictions}
                unit={selectedProduct?.unit || 'đơn vị'}
                average={summary.dailyAverage}
              />

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-secondary">
                <span>
                  Mô hình: <span className="font-medium text-slate-700">{forecast.modelName || 'Random Forest'}</span>
                  {forecast.modelVersion ? ` (v${forecast.modelVersion})` : ''}
                </span>
                <span className="text-slate-500">
                  Dữ liệu dự báo tự động tổng hợp từ lịch sử xuất kho thực tế
                </span>
              </div>
            </section>
          </div>
        )}

        {/* Trạng thái ban đầu khi chưa tạo dự báo */}
        {!isForecasting && !forecast && !forecastError && (
          <section className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-12 text-center forecast-fade-in">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-primary">
              <span className="material-symbols-outlined text-3xl">query_stats</span>
            </div>
            <h2 className="text-base font-semibold text-on-surface">Sẵn sàng phân tích & dự báo nhu cầu</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-secondary">
              Vui lòng chọn sản phẩm và khoảng thời gian (7, 14 hoặc 30 ngày), sau đó bấm{' '}
              <span className="font-semibold text-on-surface">"Tạo dự báo"</span> để mô hình học máy
              tính toán sản lượng tiêu thụ dự kiến.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ label, value, sublabel, icon, tone }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  };

  return (
    <article className="flex items-start gap-3.5 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm transition-all hover:shadow-md">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}
      >
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-secondary truncate">{label}</p>
        <p className="mt-1 break-words text-lg font-bold text-on-surface">{value}</p>
        {sublabel && <p className="mt-0.5 text-xs text-secondary truncate">{sublabel}</p>}
      </div>
    </article>
  );
}
