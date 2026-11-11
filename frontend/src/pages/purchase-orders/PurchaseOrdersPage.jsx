import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../../api/productApi';
import { purchaseOrderApi } from '../../api/purchaseOrderApi';
import { supplierApi } from '../../api/supplierApi';
import { warehouseApi } from '../../api/warehouseApi';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ToastNotification from '../../components/common/ToastNotification';
import { useToast } from '../../hooks/useToast';
import { PO_STATUS_KEYS, poActions, poProgress, poStatusConfig } from '../../utils/reorder';
import PurchaseOrderDetailModal from './PurchaseOrderDetailModal';
import PurchaseOrderFormModal from './PurchaseOrderFormModal';
import { useCanManage, useCanOperate } from '../../utils/permissions';
import { useRealtime } from '../../realtime/RealtimeProvider';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');

const CONFIRMS = {
  send: { title: 'Gửi đơn cho nhà cung cấp?', message: 'Đơn chuyển sang Đã gửi và không thể sửa nữa. Hàng đang về sẽ được AI tính vào đề xuất.', label: 'Gửi đơn', variant: 'primary', icon: 'send' },
  cancel: { title: 'Hủy đơn đặt hàng?', message: 'Đơn sẽ chuyển sang Đã hủy và không còn được tính là hàng đang về.', label: 'Hủy đơn', variant: 'error', icon: 'cancel' },
  remove: { title: 'Xóa đơn nháp?', message: 'Đơn nháp sẽ bị xóa vĩnh viễn.', label: 'Xóa', variant: 'error', icon: 'delete' },
};

/**
 * PurchaseOrdersPage - Đơn đặt hàng (/purchase-orders)
 * PO UI, Create/Edit PO UI, Purchase Status UI, Purchase API Integration.
 */
export default function PurchaseOrdersPage() {
  const canManage = useCanManage();
  const canOperate = useCanOperate();
  const { subscribe } = useRealtime();
  const { toast, showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null); // { po|null }
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind, po }
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOrders(await purchaseOrderApi.search({ status }));
    } catch (e) {
      setError(e.message || 'Không tải được danh sách đơn.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  // Đơn thay đổi ở máy khác: tải lại danh sách (debounce để không dồn nhiều lần).
  useEffect(() => {
    let timer = null;
    const unsubscribe = subscribe((msg) => {
      if (msg.type !== 'PO_UPDATED') return;
      clearTimeout(timer);
      timer = setTimeout(load, 400);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [subscribe, load]);

  useEffect(() => {
    Promise.allSettled([supplierApi.getAll(), warehouseApi.getAll(), productApi.getAll()]).then(([s, w, p]) => {
      if (s.status === 'fulfilled') setSuppliers(s.value || []);
      if (w.status === 'fulfilled') setWarehouses(w.value || []);
      if (p.status === 'fulfilled') setProducts(p.value || []);
    });
  }, []);

  const counts = useMemo(() => {
    const c = { all: orders.length };
    orders.forEach((o) => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [orders]);

  const run = async (action, successText) => {
    setBusy(true);
    try {
      const result = await action();
      showToast(successText);
      await load();
      return result;
    } catch (e) {
      showToast(e.message || 'Thao tác thất bại.', 'error');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (payload) => {
    const editing = form?.po;
    const saved = await run(
      () => (editing ? purchaseOrderApi.update(editing.id, payload) : purchaseOrderApi.create(payload)),
      editing ? 'Đã lưu đơn.' : 'Đã tạo đơn nháp.'
    );
    if (saved) setForm(null);
  };

  const handleConfirm = async () => {
    const { kind, po } = confirm;
    const map = {
      send: [() => purchaseOrderApi.send(po.id), 'Đã gửi đơn cho nhà cung cấp.'],
      cancel: [() => purchaseOrderApi.cancel(po.id), 'Đã hủy đơn.'],
      remove: [() => purchaseOrderApi.remove(po.id), 'Đã xóa đơn nháp.'],
    };
    await run(...map[kind]);
    setConfirm(null);
  };

  const handleReceive = async ({ lines, note }) => {
    const updated = await run(() => purchaseOrderApi.receive(detail.id, { lines, note }), 'Đã nhận hàng và cộng tồn kho.');
    if (updated) setDetail(updated.status === 'RECEIVED' ? null : updated);
  };

  const openDetail = async (po) => {
    try {
      setDetail(await purchaseOrderApi.getById(po.id));
    } catch (e) {
      showToast(e.message || 'Không mở được đơn.', 'error');
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div className="w-full px-margin py-space-md flex flex-col md:flex-row md:items-center md:justify-between gap-space-md bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col gap-0.5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-space-xs text-secondary font-label-default text-label-default">
            <Link to="/dashboard" className="hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">home</span><span>Bàn làm việc</span>
            </Link>
            <span className="text-outline-variant">/</span>
            <span className="text-on-surface font-body-sm-medium">Đơn đặt hàng</span>
          </nav>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">Đơn đặt hàng (Purchase Order)</h1>
          <p className="text-[12px] text-secondary">Nháp → Đã gửi → Nhận một phần → Đã nhận đủ. Nhận hàng tự cộng tồn kho.</p>
        </div>
        <div className="flex items-center gap-space-sm flex-wrap">
          <Link to="/recommendations" className="flex items-center gap-1.5 px-3 py-2 bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-surface-container-high">
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span><span>Đề xuất AI</span>
          </Link>
          {canManage && (
          <button type="button" onClick={() => setForm({ po: null })} className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-on-primary font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-primary-dim shadow-sm">
            <span className="material-symbols-outlined text-[18px]">add</span><span>Tạo đơn</span>
          </button>
          )}
        </div>
      </div>

      <div className="w-full px-margin py-space-lg flex flex-col gap-space-lg">
        {error && (
          <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2">
            <span>{error}</span>
            <button type="button" onClick={load} className="font-semibold underline">Thử lại</button>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <FilterChip active={status === ''} onClick={() => setStatus('')}>Tất cả{status === '' ? ` (${counts.all})` : ''}</FilterChip>
          {PO_STATUS_KEYS.map((k) => (
            <FilterChip key={k} active={status === k} onClick={() => setStatus(k)}>
              {poStatusConfig(k).label}{status === '' && counts[k] ? ` (${counts[k]})` : ''}
            </FilterChip>
          ))}
        </div>

        <div className="rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant overflow-x-auto">
          <table className="w-full text-left text-body-sm">
            <thead className="bg-surface-container-low text-secondary text-[12px] uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Mã đơn</th>
                <th className="px-3 py-3">Nhà cung cấp</th>
                <th className="px-3 py-3">Kho nhận</th>
                <th className="px-3 py-3">Trạng thái</th>
                <th className="px-3 py-3">Dự kiến giao</th>
                <th className="px-3 py-3 text-right">Tổng tiền</th>
                <th className="px-3 py-3 w-32">Đã nhận</th>
                <th className="px-3 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-secondary">Đang tải đơn đặt hàng...</td></tr>}
              {!loading && orders.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-secondary">Chưa có đơn nào. Bấm <b>Tạo đơn</b> hoặc tạo từ <Link to="/recommendations" className="text-primary underline">Đề xuất AI</Link>.</td></tr>
              )}
              {orders.map((po) => {
                const cfg = poStatusConfig(po.status);
                const a = poActions(po.status);
                const progress = poProgress(po);
                return (
                  <tr key={po.id} className="border-t border-outline-variant/40 hover:bg-surface-container-low/60">
                    <td className="px-4 py-3">
                      <button type="button" className="font-body-sm-medium text-primary hover:underline" onClick={() => openDetail(po)}>{po.poNumber}</button>
                      {po.aiRecommendationId && <span title="Tạo từ đề xuất AI" className="ml-1 material-symbols-outlined text-[14px] align-middle text-primary">auto_awesome</span>}
                    </td>
                    <td className="px-3 py-3">{po.supplierName}</td>
                    <td className="px-3 py-3">{po.warehouseName}</td>
                    <td className="px-3 py-3"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-[12px] font-bold border whitespace-nowrap ${cfg.badge}`}>{cfg.label}</span></td>
                    <td className="px-3 py-3 whitespace-nowrap">{fmtDate(po.expectedDeliveryDate)}</td>
                    <td className="px-3 py-3 text-right">{fmt(po.totalAmount)} ₫</td>
                    <td className="px-3 py-3">
                      <div className="h-1.5 rounded-full bg-surface-container overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} /></div>
                      <div className="text-[11px] text-secondary mt-0.5">{progress}%</div>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <RowButton onClick={() => openDetail(po)}>{a.canReceive && canOperate ? 'Nhận hàng' : 'Chi tiết'}</RowButton>
                      {canManage && a.canEdit && <RowButton onClick={() => setForm({ po })}>Sửa</RowButton>}
                      {canManage && a.canSend && <RowButton onClick={() => setConfirm({ kind: 'send', po })}>Gửi</RowButton>}
                      {canManage && a.canCancel && <RowButton tone="danger" onClick={() => setConfirm({ kind: 'cancel', po })}>Hủy</RowButton>}
                      {canManage && a.canDelete && <RowButton tone="danger" onClick={() => setConfirm({ kind: 'remove', po })}>Xóa</RowButton>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <PurchaseOrderFormModal
          po={form.po}
          suppliers={suppliers}
          warehouses={warehouses}
          products={products}
          saving={busy}
          onSubmit={handleSave}
          onClose={() => setForm(null)}
        />
      )}
      {detail && <PurchaseOrderDetailModal po={detail} receiving={busy} onReceive={handleReceive} onClose={() => setDetail(null)} />}
      <ConfirmDialog
        isOpen={!!confirm}
        title={confirm ? CONFIRMS[confirm.kind].title : ''}
        message={confirm ? `${CONFIRMS[confirm.kind].message} (${confirm.po.poNumber})` : ''}
        confirmLabel={busy ? 'Đang xử lý...' : confirm ? CONFIRMS[confirm.kind].label : ''}
        confirmVariant={confirm ? CONFIRMS[confirm.kind].variant : 'error'}
        icon={confirm ? CONFIRMS[confirm.kind].icon : 'warning'}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
      <ToastNotification visible={toast.visible} text={toast.text} icon={toast.icon} />
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[12px] font-bold border transition-colors ${
        active ? 'bg-primary-container text-on-primary-container border-primary' : 'bg-surface-container-lowest text-secondary border-outline-variant hover:bg-surface-container'
      }`}
    >
      {children}
    </button>
  );
}

function RowButton({ onClick, tone, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 text-[12px] font-bold hover:underline ${tone === 'danger' ? 'text-red-600' : 'text-primary'}`}
    >
      {children}
    </button>
  );
}
