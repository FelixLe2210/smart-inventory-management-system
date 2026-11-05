import { useCallback, useEffect, useMemo, useState } from 'react';
import { productApi } from '../../api/productApi';
import { warehouseApi } from '../../api/warehouseApi';
import { recommendationApi } from '../../api/recommendationApi';
import {
  formatRecommendationNumber,
  getRecommendationId,
  getRiskLevel,
} from '../../utils/recommendations';

const RISK_STYLES = {
  LOW: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  MEDIUM: 'border-amber-200 bg-amber-50 text-amber-800',
  HIGH: 'border-red-200 bg-red-50 text-red-800',
  UNKNOWN: 'border-slate-200 bg-slate-50 text-slate-600',
};

const RISK_LABELS = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  UNKNOWN: 'Chưa xác định',
};

const getProductId = (item) => item.productId ?? item.product_id;
const getWarehouseId = (item) => item.warehouseId ?? item.warehouse_id;
const getRecommendedQuantity = (item) => item.recommendedQuantity ?? item.recommended_quantity;
const getDate = (item, camelCase, snakeCase) => item[camelCase] ?? item[snakeCase];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(date);
}

function RiskBadge({ risk }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${RISK_STYLES[risk]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${risk === 'HIGH' ? 'bg-red-600' : risk === 'MEDIUM' ? 'bg-amber-500' : risk === 'LOW' ? 'bg-emerald-600' : 'bg-slate-400'}`} />
      {RISK_LABELS[risk]}
    </span>
  );
}

function RecommendationDetail({ recommendation, productName, warehouseName, onClose }) {
  if (!recommendation) return null;
  const risk = getRiskLevel(recommendation);
  const reasons = recommendation.reasons ?? [];
  const warnings = recommendation.warnings ?? [];
  const metrics = [
    ['Tồn kho hiện tại', recommendation.currentStock ?? recommendation.current_stock],
    ['Tồn khả dụng', recommendation.availableStock ?? recommendation.available_stock],
    ['Hàng đang về', recommendation.incomingStock ?? recommendation.incoming_stock],
    ['Vị thế tồn kho', recommendation.inventoryPosition ?? recommendation.inventory_position],
    ['Nhu cầu trung bình/ngày', recommendation.avgDailyDemand ?? recommendation.avg_daily_demand],
    ['Thời gian cung ứng (ngày)', recommendation.leadTimeDays ?? recommendation.lead_time_days],
    ['Tồn an toàn', recommendation.safetyStock ?? recommendation.safety_stock],
    ['Điểm đặt hàng lại', recommendation.reorderPoint ?? recommendation.reorder_point],
    ['Tồn mục tiêu', recommendation.targetStock ?? recommendation.target_stock],
    ['Xác suất hết hàng', recommendation.stockoutProbability ?? recommendation.stockout_probability],
    ['Số ngày đến khi hết hàng', recommendation.daysUntilStockout ?? recommendation.days_until_stockout],
    ['Thiếu hụt dự kiến', recommendation.expectedShortageUnits ?? recommendation.expected_shortage_units],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="recommendation-detail-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Chi tiết đề xuất nhập hàng</p>
            <h2 id="recommendation-detail-title" className="mt-1 text-xl font-bold text-slate-900">
              {recommendation.productName || recommendation.product_name || productName}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{recommendation.warehouseName || recommendation.warehouse_name || warehouseName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng chi tiết" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="space-y-5 p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <RiskBadge risk={risk} />
            <span className="text-sm text-slate-600">
              Đề xuất nhập <strong className="text-slate-900">{formatRecommendationNumber(getRecommendedQuantity(recommendation), 0)}</strong> sản phẩm
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              {recommendation.action || 'REORDER'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {value === null || value === undefined
                    ? '—'
                    : label === 'Xác suất hết hàng'
                      ? `${formatRecommendationNumber(Number(value) * 100, 1)}%`
                      : formatRecommendationNumber(value)}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Thời điểm đề xuất</h3>
              <p className="mt-2 text-sm text-slate-600">Ngày đặt: {formatDate(getDate(recommendation, 'suggestedOrderDate', 'suggested_order_date'))}</p>
              <p className="mt-1 text-sm text-slate-600">Dự kiến nhận: {formatDate(getDate(recommendation, 'expectedArrivalDate', 'expected_arrival_date'))}</p>
              <p className="mt-1 text-sm text-slate-600">
                Nguồn lead time: {recommendation.leadTimeSource ?? recommendation.lead_time_source ?? '—'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Cơ sở đề xuất</h3>
              {reasons.length ? (
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">
                  {reasons.map((reason, index) => <li key={`${reason}-${index}`}>{reason}</li>)}
                </ul>
              ) : <p className="mt-2 text-sm text-slate-500">API chưa cung cấp lý do.</p>}
            </div>
          </div>

          {warnings.length > 0 && (
            <div role="note" className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-900">Lưu ý</h3>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-800">
                {warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function RecommendationPage() {
  const [recommendations, setRecommendations] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [generateError, setGenerateError] = useState('');
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [detailError, setDetailError] = useState('');

  const loadRecommendations = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await recommendationApi.getAll();
      setRecommendations(data);
    } catch (error) {
      setLoadError(error.message || 'Không thể tải danh sách đề xuất.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecommendations();
    Promise.allSettled([productApi.getAll(), warehouseApi.getAll()]).then(([productResult, warehouseResult]) => {
      if (productResult.status === 'fulfilled' && Array.isArray(productResult.value)) setProducts(productResult.value);
      if (warehouseResult.status === 'fulfilled' && Array.isArray(warehouseResult.value)) setWarehouses(warehouseResult.value);
    });
  }, [loadRecommendations]);

  const productById = useMemo(() => new Map(products.map((product) => [String(product.id), product])), [products]);
  const warehouseById = useMemo(() => new Map(warehouses.map((warehouse) => [String(warehouse.id), warehouse])), [warehouses]);
  const filteredRecommendations = useMemo(() => recommendations.filter((item) => {
    const product = productById.get(String(getProductId(item)));
    const warehouse = warehouseById.get(String(getWarehouseId(item)));
    const name = item.productName || item.product_name || product?.name || '';
    const sku = item.productSku || item.product_sku || product?.sku || '';
    const warehouseName = item.warehouseName || item.warehouse_name || warehouse?.name || '';
    const matchesSearch = `${name} ${sku} ${warehouseName}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'));
    return matchesSearch && (riskFilter === 'ALL' || getRiskLevel(item) === riskFilter);
  }), [recommendations, productById, warehouseById, search, riskFilter]);

  const summary = useMemo(() => ({
    total: recommendations.length,
    high: recommendations.filter((item) => getRiskLevel(item) === 'HIGH').length,
    medium: recommendations.filter((item) => getRiskLevel(item) === 'MEDIUM').length,
    low: recommendations.filter((item) => getRiskLevel(item) === 'LOW').length,
  }), [recommendations]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError('');
    try {
      await recommendationApi.generate();
      await loadRecommendations();
    } catch (error) {
      setGenerateError(error.message || 'Không thể tính lại đề xuất.');
    } finally {
      setIsGenerating(false);
    }
  };

  const openDetail = async (item) => {
    setDetailError('');
    setSelected(item);
    if (item.id === undefined || item.id === null) return;
    try {
      const detail = await recommendationApi.getById(item.id);
      setSelected(detail);
    } catch (error) {
      setDetailError(error.message || 'Không thể tải chi tiết đề xuất.');
    }
  };

  return (
    <div className="flex min-h-full w-full flex-col">
      <header className="border-b border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 flex items-center gap-2 text-xs text-slate-500">
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              <span>Dự báo & Đề xuất AI</span><span>/</span><span className="font-medium text-slate-800">Đề xuất nhập hàng</span>
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Đề xuất nhập hàng</h1>
            <p className="mt-1 text-sm text-slate-500">Theo dõi mức rủi ro thiếu hàng và số lượng nhập được đề xuất.</p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[18px] ${isGenerating ? 'animate-spin' : ''}`}>{isGenerating ? 'progress_activity' : 'auto_awesome'}</span>
            {isGenerating ? 'Đang tính toán...' : 'Tính lại đề xuất'}
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 p-5 sm:p-8">
        {loadError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <span>{loadError}</span>
            <button type="button" onClick={loadRecommendations} className="font-semibold underline">Thử lại</button>
          </div>
        )}
        {generateError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{generateError}</div>}
        {!loadError && !recommendations.length && !isLoading && (
          <div role="note" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            API danh sách trả về thành công nhưng chưa có đề xuất nào.
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Tổng đề xuất" value={summary.total} icon="inventory_2" tone="slate" />
          <SummaryCard label="Rủi ro cao" value={summary.high} icon="error" tone="red" />
          <SummaryCard label="Rủi ro trung bình" value={summary.medium} icon="warning" tone="amber" />
          <SummaryCard label="Rủi ro thấp" value={summary.low} icon="check_circle" tone="emerald" />
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[19px] text-slate-400">search</span>
            <input
              type="search"
              aria-label="Tìm đề xuất"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo sản phẩm, SKU hoặc kho..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none focus:border-blue-500"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span>Mức rủi ro</span>
            <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500">
              <option value="ALL">Tất cả</option>
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Cao</option>
            </select>
          </label>
          <button type="button" onClick={loadRecommendations} disabled={isLoading} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}>sync</span>
            Làm mới
          </button>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-slate-500">Đang tải đề xuất...</div>
          ) : !filteredRecommendations.length ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300">inventory</span>
              <p className="mt-2 text-sm font-medium text-slate-700">{recommendations.length ? 'Không tìm thấy đề xuất phù hợp.' : 'Chưa có đề xuất nhập hàng.'}</p>
              <p className="mt-1 text-xs text-slate-500">{recommendations.length ? 'Hãy đổi từ khóa hoặc bộ lọc rủi ro.' : 'Tính lại đề xuất để cập nhật danh sách.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Sản phẩm</th>
                    <th className="px-4 py-3 font-semibold">Kho</th>
                    <th className="px-4 py-3 font-semibold">Rủi ro</th>
                    <th className="px-4 py-3 text-right font-semibold">Tồn khả dụng</th>
                    <th className="px-4 py-3 text-right font-semibold">Số lượng nhập</th>
                    <th className="px-4 py-3 font-semibold">Ngày đặt</th>
                    <th className="px-4 py-3 text-right font-semibold">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecommendations.map((item, index) => {
                    const product = productById.get(String(getProductId(item)));
                    const warehouse = warehouseById.get(String(getWarehouseId(item)));
                    const id = getRecommendationId(item) || `recommendation-${index}`;
                    const productName = item.productName || item.product_name || product?.name || `Sản phẩm #${getProductId(item) ?? '—'}`;
                    const productSku = item.productSku || item.product_sku || product?.sku;
                    const warehouseName = item.warehouseName || item.warehouse_name || warehouse?.name || `Kho #${getWarehouseId(item) ?? '—'}`;
                    return (
                      <tr key={id} className="transition hover:bg-slate-50/80">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">{productName}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{productSku || `ID ${getProductId(item) ?? '—'}`}</p>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-700">{warehouseName}</td>
                        <td className="px-4 py-4"><RiskBadge risk={getRiskLevel(item)} /></td>
                        <td className="px-4 py-4 text-right text-sm text-slate-700">{formatRecommendationNumber(item.availableStock ?? item.available_stock)}</td>
                        <td className="px-4 py-4 text-right font-semibold text-slate-900">{formatRecommendationNumber(getRecommendedQuantity(item), 0)}</td>
                        <td className="px-4 py-4 text-sm text-slate-600">{formatDate(getDate(item, 'suggestedOrderDate', 'suggested_order_date'))}</td>
                        <td className="px-4 py-4 text-right">
                          <button type="button" onClick={() => openDetail(item)} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50">Xem</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {selected && (
        <RecommendationDetail
          recommendation={selected}
          productName={productById.get(String(getProductId(selected)))?.name || ''}
          warehouseName={warehouseById.get(String(getWarehouseId(selected)))?.name || ''}
          onClose={() => {
            setSelected(null);
            setDetailError('');
          }}
        />
      )}
      {detailError && selected && (
        <div role="alert" className="fixed bottom-5 right-5 z-[60] max-w-md rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-lg">
          {detailError}
          <button type="button" onClick={() => setDetailError('')} aria-label="Đóng thông báo" className="ml-3 font-semibold">×</button>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, tone }) {
  const toneStyles = {
    slate: 'bg-slate-50 text-slate-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={`material-symbols-outlined flex h-10 w-10 items-center justify-center rounded-xl ${toneStyles[tone]}`}>{icon}</span>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
