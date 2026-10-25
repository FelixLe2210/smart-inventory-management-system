import { useCallback, useEffect, useMemo, useState } from 'react';
import { productApi } from '../../api/productApi';
import { forecastApi } from '../../api/forecastApi';
import ForecastChart from './ForecastChart';

const FORECAST_HORIZONS = [7, 14, 30, 60];

function formatNumber(value) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value);
}

export default function ForecastPage() {
  const [products, setProducts] = useState([]);
  const [selectedSku, setSelectedSku] = useState('');
  const [horizonDays, setHorizonDays] = useState(30);
  const [forecast, setForecast] = useState(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isForecasting, setIsForecasting] = useState(false);
  const [error, setError] = useState('');
  const [productsError, setProductsError] = useState('');

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
      setSelectedSku((currentSku) =>
        activeProducts.some((product) => product.sku === currentSku)
          ? currentSku
          : activeProducts[0]?.sku || ''
      );
    } catch (loadError) {
      setProductsError(loadError.message || 'Không thể tải danh sách sản phẩm.');
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const selectedProduct = products.find((product) => product.sku === selectedSku);
  const summary = useMemo(() => {
    if (!forecast?.predictions.length) return null;
    const values = forecast.predictions.map((point) => point.predictedDemand);
    const total = values.reduce((sum, value) => sum + value, 0);
    const peakIndex = values.indexOf(Math.max(...values));
    return {
      total,
      dailyAverage: total / values.length,
      peak: forecast.predictions[peakIndex],
    };
  }, [forecast]);

  const handleGenerateForecast = async (event) => {
    event.preventDefault();
    if (!selectedSku) return;
    setIsForecasting(true);
    setError('');
    setForecast(null);
    try {
      const result = await forecastApi.getForecast({ sku: selectedSku, horizonDays });
      setForecast(result);
    } catch (forecastError) {
      setError(forecastError.message || 'Không thể tạo dự báo. Vui lòng thử lại.');
    } finally {
      setIsForecasting(false);
    }
  };

  const handleSelectionChange = (update) => {
    setForecast(null);
    setError('');
    update();
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
              Ước tính nhu cầu tương lai để chủ động kế hoạch tồn kho.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            AI Demand Forecast
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 p-5 sm:p-8">
        <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-on-surface">Thiết lập dự báo</h2>
            <p className="mt-1 text-sm text-secondary">
              Chọn sản phẩm và khoảng thời gian cần dự báo.
            </p>
          </div>
          <form onSubmit={handleGenerateForecast} className="grid grid-cols-1 items-end gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.8fr)_auto]">
            <label className="flex flex-col gap-2 text-sm font-medium text-on-surface">
              Sản phẩm
              <select
                value={selectedSku}
                onChange={(event) =>
                  handleSelectionChange(() => setSelectedSku(event.target.value))
                }
                disabled={isLoadingProducts || isForecasting || products.length === 0}
                className="h-11 rounded-lg border border-outline-variant bg-white px-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-container-low"
              >
                {isLoadingProducts && <option value="">Đang tải sản phẩm...</option>}
                {!isLoadingProducts && products.length === 0 && <option value="">Không có sản phẩm đang hoạt động</option>}
                {products.map((product) => (
                  <option key={product.sku} value={product.sku}>
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
                  <option key={days} value={days}>{days} ngày tới</option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={!selectedSku || isLoadingProducts || isForecasting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <span className={`material-symbols-outlined text-[18px] ${isForecasting ? 'animate-spin' : ''}`}>
                {isForecasting ? 'progress_activity' : 'auto_awesome'}
              </span>
              {isForecasting ? 'Đang dự báo...' : 'Tạo dự báo'}
            </button>
          </form>

          {productsError && (
            <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{productsError}</span>
              <button type="button" onClick={loadProducts} className="font-semibold underline">
                Tải lại
              </button>
            </div>
          )}
          {!isLoadingProducts && !productsError && products.length === 0 && (
            <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Chưa có sản phẩm đang hoạt động. Hãy tạo hoặc kích hoạt sản phẩm trước khi dự báo.
            </p>
          )}
        </section>

        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <span className="material-symbols-outlined text-xl">error</span>
            <div>
              <p className="font-semibold">Không thể tạo dự báo</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {forecast && summary ? (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SummaryCard
                label={`Tổng nhu cầu dự kiến · ${horizonDays} ngày`}
                value={`${formatNumber(summary.total)} ${selectedProduct?.unit || 'đơn vị'}`}
                icon="inventory_2"
                tone="blue"
              />
              <SummaryCard
                label="Nhu cầu trung bình / ngày"
                value={`${formatNumber(summary.dailyAverage)} ${selectedProduct?.unit || 'đơn vị'}`}
                icon="avg_pace"
                tone="violet"
              />
              <SummaryCard
                label="Ngày có nhu cầu cao nhất"
                value={`${formatNumber(summary.peak.predictedDemand)} ${selectedProduct?.unit || 'đơn vị'}`}
                detail={new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeZone: 'UTC' }).format(
                  new Date(`${summary.peak.date}T00:00:00Z`)
                )}
                icon="trending_up"
                tone="green"
              />
            </section>

            <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-on-surface">Nhu cầu dự báo</h2>
                  <p className="mt-1 text-sm text-secondary">
                    {selectedProduct?.name} · SKU {forecast.sku} · {forecast.horizonDays} ngày
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-secondary">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-0.5 w-5 rounded bg-blue-600" />
                    Nhu cầu dự báo
                  </span>
                  {forecast.predictions.some(
                    (point) => point.lowerBound !== null && point.upperBound !== null
                  ) && (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-5 rounded bg-blue-200" />
                      Khoảng dự báo
                    </span>
                  )}
                </div>
              </div>
              <ForecastChart predictions={forecast.predictions} />
              {forecast.generatedAt && (
                <p className="mt-2 text-right text-xs text-secondary">
                  Tạo lúc {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(forecast.generatedAt))}
                </p>
              )}
            </section>
          </>
        ) : (
          <section className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-primary">
              <span className="material-symbols-outlined text-3xl">query_stats</span>
            </div>
            <h2 className="text-base font-semibold text-on-surface">Sẵn sàng tạo dự báo</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-secondary">
              Chọn sản phẩm và khoảng thời gian, sau đó tạo dự báo để xem biểu đồ nhu cầu theo ngày.
              Kết quả sẽ xuất hiện tại đây khi AI service trả về dữ liệu.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ label, value, detail, icon, tone }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    violet: 'bg-violet-50 text-violet-700',
    green: 'bg-emerald-50 text-emerald-700',
  };

  return (
    <article className="flex items-start gap-4 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-secondary">{label}</p>
        <p className="mt-1 break-words text-lg font-bold text-on-surface">{value}</p>
        {detail && <p className="mt-0.5 text-xs text-secondary">{detail}</p>}
      </div>
    </article>
  );
}
