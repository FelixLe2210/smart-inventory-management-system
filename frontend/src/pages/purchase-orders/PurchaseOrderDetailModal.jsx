import { useMemo, useState } from 'react';
import { buildReceiveLines, poActions, poProgress, poStatusConfig } from '../../utils/reorder';
import { useCanOperate } from '../../utils/permissions';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');

/** Chi tiết PO + nhận hàng từng phần. */
export default function PurchaseOrderDetailModal({ po, receiving, onReceive, onClose }) {
  const actions = poActions(po.status);
  // Chỉ người được vận hành kho mới nhận hàng; VIEWER chỉ xem.
  const canOperate = useCanOperate();
  const canReceive = actions.canReceive && canOperate;
  const status = poStatusConfig(po.status);
  const progress = poProgress(po);
  const [quantities, setQuantities] = useState({});
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState([]);

  const receiveAll = () => {
    const all = {};
    po.items.forEach((i) => {
      if (i.remainingQty > 0) all[i.id] = String(i.remainingQty);
    });
    setQuantities(all);
  };

  const hasQuantities = useMemo(() => Object.values(quantities).some((v) => v !== '' && Number(v) > 0), [quantities]);

  const submit = () => {
    const { lines, errors: found } = buildReceiveLines(po, quantities);
    setErrors(found);
    if (found.length === 0) onReceive({ lines, note });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30">
        <div className="px-space-lg py-space-md border-b border-outline-variant/30 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">{po.poNumber}</h3>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[12px] font-bold border ${status.badge}`}>{status.label}</span>
            </div>
            <div className="text-body-sm text-secondary">
              {po.supplierName} → {po.warehouseName}
              {po.aiRecommendationId && <span className="ml-2 text-primary">· tạo từ đề xuất AI</span>}
            </div>
          </div>
          <button type="button" aria-label="Đóng" onClick={onClose} className="p-1 rounded-lg hover:bg-surface-container">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-space-lg flex flex-col gap-space-md">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-body-sm">
            <Info label="Ngày đặt" value={fmtDate(po.orderDate)} />
            <Info label="Dự kiến giao" value={fmtDate(po.expectedDeliveryDate)} />
            <Info label="Giao thực tế" value={fmtDate(po.actualDeliveryDate)} />
            <Info label="Tổng tiền" value={`${fmt(po.totalAmount)} ₫`} />
          </div>

          <div>
            <div className="flex items-center justify-between text-[12px] text-secondary mb-1">
              <span>Tiến độ nhận hàng</span><span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-container overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {errors.length > 0 && (
            <ul role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs list-disc pl-6">
              {errors.map((x) => <li key={x}>{x}</li>)}
            </ul>
          )}

          <table className="w-full text-body-sm">
            <thead className="text-[12px] text-secondary uppercase">
              <tr>
                <th className="text-left py-2">Sản phẩm</th>
                <th className="text-right py-2">Đặt</th>
                <th className="text-right py-2">Đã nhận</th>
                <th className="text-right py-2">Còn lại</th>
                <th className="text-right py-2">Thành tiền</th>
                {canReceive && <th className="text-right py-2 w-28">Nhận lần này</th>}
              </tr>
            </thead>
            <tbody>
              {po.items.map((i) => (
                <tr key={i.id} className="border-t border-outline-variant/30">
                  <td className="py-2">
                    <div className="font-body-sm-medium">{i.productName}</div>
                    <div className="text-[11px] text-secondary">{i.productSku} · {fmt(i.unitPrice)} ₫/{i.unit}</div>
                  </td>
                  <td className="py-2 text-right">{fmt(i.orderedQty)}</td>
                  <td className="py-2 text-right text-emerald-700">{fmt(i.receivedQty)}</td>
                  <td className="py-2 text-right">{fmt(i.remainingQty)}</td>
                  <td className="py-2 text-right">{fmt(i.totalPrice)} ₫</td>
                  {canReceive && (
                    <td className="py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        max={i.remainingQty}
                        step="1"
                        disabled={i.remainingQty === 0}
                        aria-label={`Số lượng nhận ${i.productSku}`}
                        value={quantities[i.id] ?? ''}
                        onChange={(e) => setQuantities((q) => ({ ...q, [i.id]: e.target.value }))}
                        className="w-24 px-2 py-1 rounded-lg border border-outline-variant bg-surface text-right disabled:opacity-40"
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {po.note && <p className="text-body-sm text-secondary">Ghi chú: {po.note}</p>}

          {canReceive && (
            <div className="rounded-xl bg-primary-container/40 p-4 flex flex-col gap-2">
              <div className="text-body-sm">
                Nhận hàng sẽ <b>cộng tồn kho tại {po.warehouseName}</b> và ghi vào Lịch sử giao dịch (tham chiếu {po.poNumber}).
                Hệ thống không cho nhận vượt số lượng còn lại nên không bị nhập kho hai lần.
              </div>
              <input
                type="text"
                maxLength={200}
                placeholder="Ghi chú nhận hàng (tùy chọn)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="px-3 py-2 rounded-lg border border-outline-variant bg-surface text-body-sm"
              />
            </div>
          )}
        </div>

        <div className="px-space-lg py-space-md bg-surface-container-low border-t border-outline-variant/20 flex justify-end gap-space-sm">
          <button type="button" className="px-4 py-2 bg-surface-container rounded-lg text-body-sm-medium" onClick={onClose}>Đóng</button>
          {canReceive && (
            <>
              <button type="button" className="px-4 py-2 bg-surface-container rounded-lg text-body-sm-medium" onClick={receiveAll}>Nhận đủ phần còn lại</button>
              <button
                type="button"
                disabled={receiving || !hasQuantities}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-body-sm-medium disabled:opacity-50"
                onClick={submit}
              >
                {receiving ? 'Đang nhập kho...' : 'Xác nhận nhận hàng'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-[11px] text-secondary">{label}</div>
      <div className="font-body-sm-medium">{value}</div>
    </div>
  );
}
