import { useMemo, useState } from 'react';
import { buildPoPayload, poToForm, validatePoForm } from '../../utils/reorder';

const EMPTY_ITEM = { productId: '', orderedQty: '', unitPrice: '' };
const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n) || 0);

/** Form tạo / sửa Purchase Order nháp. */
export default function PurchaseOrderFormModal({ po, suppliers, warehouses, products, saving, onSubmit, onClose }) {
  const isEdit = !!po;
  const [form, setForm] = useState(() =>
    po ? poToForm(po) : { supplierId: '', destinationWarehouseId: '', expectedDeliveryDate: '', note: '', items: [{ ...EMPTY_ITEM }] }
  );
  const [errors, setErrors] = useState([]);

  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.status === 'ACTIVE'), [suppliers]);
  const activeWarehouses = useMemo(() => warehouses.filter((w) => w.status === 'ACTIVE'), [warehouses]);
  const productById = useMemo(() => new Map(products.map((p) => [String(p.id), p])), [products]);

  // Chỉ gợi ý sản phẩm ACTIVE; nếu đã chọn nhà cung cấp thì ưu tiên sản phẩm của nhà cung cấp đó.
  const selectableProducts = useMemo(() => {
    const active = products.filter((p) => p.status === 'ACTIVE');
    if (!form.supplierId) return active;
    const ofSupplier = active.filter((p) => String(p.supplierId) === String(form.supplierId));
    return ofSupplier.length > 0 ? ofSupplier : active;
  }, [products, form.supplierId]);

  const total = useMemo(
    () =>
      form.items.reduce((sum, i) => {
        const price = i.unitPrice !== '' && i.unitPrice != null ? Number(i.unitPrice) : Number(productById.get(String(i.productId))?.purchasePrice) || 0;
        return sum + (Number(i.orderedQty) || 0) * price;
      }, 0),
    [form.items, productById]
  );

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setItem = (index, patch) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) }));
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const removeItem = (index) =>
    setForm((f) => ({ ...f, items: f.items.length > 1 ? f.items.filter((_, i) => i !== index) : f.items }));

  const submit = (e) => {
    e.preventDefault();
    const found = validatePoForm(form);
    setErrors(found);
    if (found.length === 0) onSubmit(buildPoPayload(form));
  };

  const input = 'px-3 py-2 rounded-lg border border-outline-variant bg-surface text-body-sm w-full';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30">
        <div className="px-space-lg py-space-md border-b border-outline-variant/30 flex items-center justify-between">
          <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
            {isEdit ? `Sửa đơn ${po.poNumber}` : 'Tạo đơn đặt hàng'}
          </h3>
          <button type="button" aria-label="Đóng" onClick={onClose} className="p-1 rounded-lg hover:bg-surface-container">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-space-lg flex flex-col gap-space-md">
          {errors.length > 0 && (
            <ul role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs list-disc pl-6">
              {errors.map((x) => <li key={x}>{x}</li>)}
            </ul>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
            <label className="flex flex-col gap-1 text-body-sm">
              <span className="font-body-sm-medium">Nhà cung cấp *</span>
              <select className={input} value={form.supplierId} onChange={(e) => setField('supplierId', e.target.value)}>
                <option value="">— Chọn —</option>
                {activeSuppliers.map((s) => <option key={s.id} value={s.id}>{s.name} (lead time {s.leadTimeDays}n)</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-body-sm">
              <span className="font-body-sm-medium">Kho nhận hàng *</span>
              <select className={input} value={form.destinationWarehouseId} onChange={(e) => setField('destinationWarehouseId', e.target.value)}>
                <option value="">— Chọn —</option>
                {activeWarehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-body-sm">
              <span className="font-body-sm-medium">Ngày giao dự kiến</span>
              <input type="date" className={input} value={form.expectedDeliveryDate || ''} onChange={(e) => setField('expectedDeliveryDate', e.target.value)} />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-body-sm-medium text-body-sm">Sản phẩm đặt</span>
              <button type="button" onClick={addItem} className="text-primary text-[12px] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">add</span>Thêm dòng
              </button>
            </div>
            {form.items.map((item, index) => {
              const product = productById.get(String(item.productId));
              return (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <label className="col-span-6 flex flex-col gap-1 text-[12px]">
                    <span className="text-secondary">Sản phẩm</span>
                    <select className={input} value={item.productId} onChange={(e) => setItem(index, { productId: e.target.value })}>
                      <option value="">— Chọn —</option>
                      {selectableProducts.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                      {product && !selectableProducts.includes(product) && <option value={product.id}>{product.sku} — {product.name}</option>}
                    </select>
                  </label>
                  <label className="col-span-2 flex flex-col gap-1 text-[12px]">
                    <span className="text-secondary">Số lượng</span>
                    <input type="number" min="1" step="1" className={input} value={item.orderedQty} onChange={(e) => setItem(index, { orderedQty: e.target.value })} />
                  </label>
                  <label className="col-span-3 flex flex-col gap-1 text-[12px]">
                    <span className="text-secondary">Đơn giá {product ? `(nhập: ${fmt(product.purchasePrice)})` : ''}</span>
                    <input type="number" min="0" step="0.01" placeholder="Mặc định" className={input} value={item.unitPrice ?? ''} onChange={(e) => setItem(index, { unitPrice: e.target.value })} />
                  </label>
                  <button type="button" aria-label="Xóa dòng" onClick={() => removeItem(index)} className="col-span-1 p-2 text-red-600 rounded-lg hover:bg-red-50">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              );
            })}
          </div>

          <label className="flex flex-col gap-1 text-body-sm">
            <span className="font-body-sm-medium">Ghi chú</span>
            <textarea rows={2} className={input} value={form.note || ''} onChange={(e) => setField('note', e.target.value)} />
          </label>

          <div className="text-right text-body-sm">
            Tạm tính: <b className="text-[18px]">{fmt(total)} ₫</b>
          </div>
        </div>

        <div className="px-space-lg py-space-md bg-surface-container-low border-t border-outline-variant/20 flex justify-end gap-space-sm">
          <button type="button" className="px-4 py-2 bg-surface-container rounded-lg text-body-sm-medium" onClick={onClose}>Hủy</button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-on-primary rounded-lg text-body-sm-medium disabled:opacity-60">
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo đơn nháp'}
          </button>
        </div>
      </form>
    </div>
  );
}
