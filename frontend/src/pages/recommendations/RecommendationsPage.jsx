import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { reorderApi } from '../../api/reorderApi';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ToastNotification from '../../components/common/ToastNotification';
import { useToast } from '../../hooks/useToast';
import {
  ACTION,
  formatProbability,
  isPlaceholderForecast,
  recommendationStatusConfig,
  riskConfig,
  sortRecommendations,
  summarizeRecommendations,
  urgencyConfig,
} from '../../utils/reorder';
import { useCanManage } from '../../utils/permissions';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');

const STATUS_FILTERS = [
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: '', label: 'Tất cả' },
  { value: 'ACCEPTED', label: 'Đã tạo đơn' },
  { value: 'REJECTED', label: 'Đã bỏ qua' },
];

function Badge({ cfg, children, title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-bold border whitespace-nowrap ${cfg.badge}`}
    >
      {cfg.dot && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
      {children}
    </span>
  );
}

/**
 * RecommendationsPage - Đề xuất đặt hàng thông minh (/recommendations)
 * Recommendation List UI / Detail UI / Risk Level UI / Recommendation API Client
 * Recommendation -> Purchase UI (nút "Tạo đơn" tạo PO nháp từ đề xuất).
 */
export default function RecommendationsPage() {
  const canManage = useCanManage();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [status, setStatus] = useState('PENDING');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [accepting, setAccepting] = useState(null); // { rec, quantity }
  const [rejecting, setRejecting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await reorderApi.list(status));
    } catch (e) {
      setError(e.message || 'Không tải được danh sách đề xuất.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(() => sortRecommendations(items), [items]);
  const summary = useMemo(() => summarizeRecommendations(items), [items]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const created = await reorderApi.generate();
      showToast(created.length ? `AI đã tính ${created.length} đề xuất.` : 'Không có sản phẩm nào cần đặt thêm.');
      await load();
    } catch (e) {
      setError(e.message || 'AI service không phản hồi.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAccept = async () => {
    setBusy(true);
    try {
      const po = await reorderApi.accept(accepting.rec.id, accepting.quantity);
      showToast(`Đã tạo đơn nháp ${po.poNumber}.`);
      setAccepting(null);
      setDetail(null);
      navigate('/purchase-orders');
    } catch (e) {
      showToast(e.message || 'Không tạo được đơn.', 'error');
      setAccepting(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    setBusy(true);
    try {
      await reorderApi.reject(rejecting.id);
      showToast('Đã bỏ qua đề xuất.');
      setRejecting(null);
      setDetail(null);
      await load();
    } catch (e) {
      showToast(e.message || 'Không thể bỏ qua đề xuất.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div className="w-full px-margin py-space-md flex flex-col md:flex-row md:items-center md:justify-between gap-space-md bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col gap-0.5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-space-xs text-secondary font-label-default text-label-default">
            <Link to="/dashboard" className="hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">home</span>
              <span>Bàn làm việc</span>
            </Link>
            <span className="text-outline-variant">/</span>
            <span className="text-on-surface font-body-sm-medium">Đề xuất đặt hàng</span>
          </nav>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">
            Đề xuất đặt hàng thông minh
          </h1>
          <p className="text-[12px] text-secondary">
            AI dự báo nhu cầu, trừ tồn kho và hàng đang về, tính safety stock, lead time và rủi ro thiếu hàng.
          </p>
        </div>
        <div className="flex items-center gap-space-sm flex-wrap">
          <Link
            to="/purchase-orders"
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            <span>Đơn đặt hàng</span>
          </Link>
          {canManage && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-on-primary font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-primary-dim transition-colors shadow-sm disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[18px] ${generating ? 'animate-spin' : ''}`}>
              {generating ? 'sync' : 'auto_awesome'}
            </span>
            <span>{generating ? 'AI đang tính...' : 'Tính đề xuất bằng AI'}</span>
          </button>
          )}
        </div>
      </div>

      <div className="w-full px-margin py-space-lg flex flex-col gap-space-lg">
        {error && (
          <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </span>
            <button type="button" onClick={load} className="font-semibold underline">Thử lại</button>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard label="Chờ xử lý" value={summary.pending} icon="pending_actions" tone="bg-sky-50 text-sky-600" />
          <SummaryCard label="Khẩn cấp" value={summary.critical} icon="emergency" tone="bg-red-50 text-red-600" />
          <SummaryCard label="Mức cao" value={summary.high} icon="priority_high" tone="bg-orange-50 text-orange-600" />
          <SummaryCard label="Cần giục hàng về" value={summary.expedite} icon="local_shipping" tone="bg-amber-50 text-amber-600" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value || 'all'}
              type="button"
              onClick={() => setStatus(f.value)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-bold border transition-colors ${
                status === f.value
                  ? 'bg-primary-container text-on-primary-container border-primary'
                  : 'bg-surface-container-lowest text-secondary border-outline-variant hover:bg-surface-container'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant overflow-x-auto">
          <table className="w-full text-left text-body-sm">
            <thead className="bg-surface-container-low text-secondary text-[12px] uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Sản phẩm / Kho</th>
                <th className="px-3 py-3 text-right">Tồn / Đang về</th>
                <th className="px-3 py-3 text-right">Điểm đặt hàng</th>
                <th className="px-3 py-3">Rủi ro thiếu hàng</th>
                <th className="px-3 py-3 text-right">Đề xuất đặt</th>
                <th className="px-3 py-3">Đặt trước ngày</th>
                <th className="px-3 py-3">Mức khẩn</th>
                <th className="px-3 py-3">Trạng thái</th>
                <th className="px-3 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-secondary">Đang tải đề xuất...</td></tr>
              )}
              {!loading && sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-secondary">
                    <span className="material-symbols-outlined text-[36px] block mb-2 opacity-60">inventory</span>
                    Chưa có đề xuất nào. Bấm <b>Tính đề xuất bằng AI</b> để AI kiểm tra toàn bộ tồn kho.
                  </td>
                </tr>
              )}
              {sorted.map((r) => (
                <tr key={r.id} className="border-t border-outline-variant/40 hover:bg-surface-container-low/60">
                  <td className="px-4 py-3">
                    <div className="font-body-sm-medium text-on-surface">{r.productName}</div>
                    <div className="text-[11px] text-secondary">{r.productSku} · {r.warehouseName}</div>
                    {isPlaceholderForecast(r) && (
                      <div className="mt-1 text-[11px] text-amber-700 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">warning</span>
                        Thiếu lịch sử bán — chỉ mang tính tham khảo
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">{fmt(r.currentStock)} / <span className="text-sky-700">{fmt(r.incomingStock)}</span></td>
                  <td className="px-3 py-3 text-right">{fmt(r.reorderPoint)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <Badge cfg={riskConfig(r.shortageRisk)} title="Xác suất hết hàng trước khi lô mới kịp về">
                      {riskConfig(r.shortageRisk).label} · {formatProbability(r.stockoutProbability)}
                    </Badge>
                    {r.details?.days_until_stockout != null && (
                      <div className="text-[11px] text-secondary mt-0.5">Hết hàng sau ~{r.details.days_until_stockout} ngày</div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-bold">
                    {r.action === 'EXPEDITE_INCOMING' ? (
                      <span className="text-amber-700 text-[12px]">{ACTION.EXPEDITE_INCOMING.label}</span>
                    ) : (
                      <>{fmt(r.recommendedOrderQty)} <span className="font-normal text-secondary text-[11px]">{r.unit}</span></>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{fmtDate(r.suggestedOrderDate)}</td>
                  <td className="px-3 py-3"><Badge cfg={urgencyConfig(r.urgencyLevel)}>{urgencyConfig(r.urgencyLevel).label}</Badge></td>
                  <td className="px-3 py-3"><Badge cfg={recommendationStatusConfig(r.status)}>{recommendationStatusConfig(r.status).label}</Badge></td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <button type="button" className="px-2 py-1 text-primary font-bold text-[12px] hover:underline" onClick={() => setDetail(r)}>
                      Chi tiết
                    </button>
                    {canManage && r.status === 'PENDING' && r.recommendedOrderQty > 0 && (
                      <button
                        type="button"
                        className="ml-1 px-2.5 py-1 bg-primary text-on-primary rounded-md text-[12px] font-bold hover:bg-primary-dim"
                        onClick={() => setAccepting({ rec: r, quantity: String(r.recommendedOrderQty) })}
                      >
                        Tạo đơn
                      </button>
                    )}
                    {r.purchaseOrderId && (
                      <Link to="/purchase-orders" className="ml-1 text-[12px] text-emerald-700 font-bold hover:underline">Xem đơn</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <DetailModal
          rec={detail}
          onClose={() => setDetail(null)}
          onAccept={() => setAccepting({ rec: detail, quantity: String(detail.recommendedOrderQty) })}
          onReject={() => setRejecting(detail)}
        />
      )}

      {accepting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 p-space-lg flex flex-col gap-space-md">
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Tạo đơn đặt hàng nháp</h3>
            <p className="text-body-sm text-secondary">
              {accepting.rec.productName} · {accepting.rec.warehouseName}
              <br />Nhà cung cấp: <b>{accepting.rec.supplierName || 'chưa gán'}</b>
            </p>
            <label className="flex flex-col gap-1 text-body-sm">
              <span className="font-body-sm-medium">Số lượng đặt (AI đề xuất {fmt(accepting.rec.recommendedOrderQty)})</span>
              <input
                type="number"
                min="1"
                step="1"
                value={accepting.quantity}
                onChange={(e) => setAccepting({ ...accepting, quantity: e.target.value })}
                className="px-3 py-2 rounded-lg border border-outline-variant bg-surface"
              />
            </label>
            {!accepting.rec.supplierId && (
              <p className="text-[12px] text-red-700">Sản phẩm chưa có nhà cung cấp: hãy gán nhà cung cấp ở trang Sản phẩm trước.</p>
            )}
            <div className="flex justify-end gap-space-sm">
              <button type="button" className="px-4 py-2 bg-surface-container rounded-lg text-body-sm-medium" onClick={() => setAccepting(null)}>Hủy</button>
              <button
                type="button"
                disabled={busy || !(Number(accepting.quantity) >= 1) || !accepting.rec.supplierId}
                className="px-4 py-2 bg-primary text-on-primary rounded-lg text-body-sm-medium disabled:opacity-50"
                onClick={handleAccept}
              >
                {busy ? 'Đang tạo...' : 'Tạo đơn nháp'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!rejecting}
        title="Bỏ qua đề xuất?"
        message="Đề xuất sẽ chuyển sang trạng thái Đã bỏ qua. Bạn có thể bấm 'Tính đề xuất bằng AI' để tạo lại."
        confirmLabel={busy ? 'Đang xử lý...' : 'Bỏ qua đề xuất'}
        onConfirm={handleReject}
        onCancel={() => setRejecting(null)}
      />
      <ToastNotification visible={toast.visible} text={toast.text} icon={toast.icon} />
    </div>
  );
}

function SummaryCard({ label, value, icon, tone }) {
  return (
    <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm border border-outline-variant flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tone}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <div className="text-[22px] font-bold text-on-surface leading-none">{value}</div>
        <div className="text-[12px] text-secondary mt-1">{label}</div>
      </div>
    </div>
  );
}

function DetailModal({ rec, onClose, onAccept, onReject }) {
  const canManage = useCanManage();
  const d = rec.details || {};
  const placeholder = isPlaceholderForecast(rec);
  const rows = [
    ['Tồn hiện tại / khả dụng', `${fmt(d.current_stock ?? rec.currentStock)} / ${fmt(d.available_stock)}`],
    ['Hàng đang về (PO đã gửi)', fmt(rec.incomingStock)],
    ['Vị thế tồn (tồn + đang về)', fmt(d.inventory_position)],
    ['Nhu cầu TB mỗi ngày (AI #1)', `${d.avg_daily_demand ?? '—'} ± ${d.demand_std ?? '—'}`],
    ['Lead time nhà cung cấp', `${d.lead_time_days ?? rec.supplierLeadTimeDays} ngày (±${d.lead_time_std_days ?? 0}) · nguồn: ${d.lead_time_source ?? '—'}`],
    ['Safety stock', fmt(rec.safetyStock)],
    ['Điểm đặt hàng (ROP)', fmt(rec.reorderPoint)],
    ['Mức tồn mục tiêu', fmt(d.target_stock)],
    ['Xác suất hết hàng trước khi hàng về', formatProbability(rec.stockoutProbability)],
    ['Thiếu hụt kỳ vọng', `${fmt(d.expected_shortage_units)} ${rec.unit || ''}`],
    ['Ngày hàng dự kiến về', fmtDate(rec.expectedArrivalDate)],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30">
        <div className="px-space-lg py-space-md border-b border-outline-variant/30 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] text-secondary">{rec.recommendationCode}</div>
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">{rec.productName}</h3>
            <div className="text-body-sm text-secondary">{rec.productSku} · {rec.warehouseName}</div>
          </div>
          <button type="button" aria-label="Đóng" onClick={onClose} className="p-1 rounded-lg hover:bg-surface-container">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-space-lg flex flex-col gap-space-md">
          {placeholder && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex gap-2">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              <span>Sản phẩm chưa đủ 14 ngày dữ liệu xuất kho nên AI không dùng được mô hình dự báo (nhu cầu lấy trung bình ngày đã bán, hoặc coi là 0 nếu dưới 7 ngày). Hãy xem đây là gợi ý tham khảo.</span>
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <Badge cfg={urgencyConfig(rec.urgencyLevel)}>Mức khẩn: {urgencyConfig(rec.urgencyLevel).label}</Badge>
            <Badge cfg={riskConfig(rec.shortageRisk)}>{riskConfig(rec.shortageRisk).label}</Badge>
            <span className="px-2.5 py-0.5 rounded-full text-[12px] font-bold border bg-surface-container text-on-surface">
              {(ACTION[rec.action] || ACTION.REORDER).label}
            </span>
          </div>

          <div className="rounded-xl bg-primary-container/40 p-4">
            {rec.action === 'EXPEDITE_INCOMING' ? (
              <div className="text-body-sm">Đã có đủ hàng đặt nhưng <b>sẽ về sau khi hết hàng</b>. Hãy liên hệ nhà cung cấp để giao sớm hơn.</div>
            ) : (
              <div className="text-body-sm">
                Nên đặt <b className="text-[18px]">{fmt(rec.recommendedOrderQty)} {rec.unit}</b> trước ngày <b>{fmtDate(rec.suggestedOrderDate)}</b>
                {d.days_late > 0 && <span className="text-red-700"> — dù đặt ngay hàng vẫn về trễ ~{d.days_late} ngày so với lúc hết hàng.</span>}
              </div>
            )}
          </div>

          <table className="w-full text-body-sm">
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k} className="border-b border-outline-variant/30">
                  <td className="py-1.5 pr-3 text-secondary">{k}</td>
                  <td className="py-1.5 text-right font-body-sm-medium">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {(d.reasons || []).length > 0 && (
            <div>
              <div className="font-body-sm-medium mb-1">Vì sao AI đề xuất</div>
              <ul className="list-disc pl-5 text-body-sm text-on-surface-variant space-y-0.5">
                {d.reasons.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          )}
          {(d.warnings || []).length > 0 && (
            <div>
              <div className="font-body-sm-medium mb-1 text-amber-800">Lưu ý</div>
              <ul className="list-disc pl-5 text-body-sm text-amber-800 space-y-0.5">
                {d.warnings.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          )}
          <div className="text-[11px] text-secondary">
            Mô hình dự báo: {d.forecast_model ?? '—'} v{d.forecast_model_version ?? '—'} · Lịch sử bán: {d.history_days ?? 0} ngày · Service level {(d.assumptions?.service_level ?? 0.95) * 100}%
          </div>
        </div>

        {canManage && rec.status === 'PENDING' && (
          <div className="px-space-lg py-space-md bg-surface-container-low border-t border-outline-variant/20 flex justify-end gap-space-sm">
            <button type="button" className="px-4 py-2 bg-surface-container rounded-lg text-body-sm-medium" onClick={onReject}>Bỏ qua</button>
            {rec.recommendedOrderQty > 0 && (
              <button type="button" className="px-4 py-2 bg-primary text-on-primary rounded-lg text-body-sm-medium" onClick={onAccept}>Tạo đơn đặt hàng</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
