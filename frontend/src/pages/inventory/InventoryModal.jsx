const FIELD = 'w-full h-10 px-3 bg-surface-container-low rounded-lg outline-none text-body-sm border';
const OK = 'border-outline-variant/50 focus:border-primary';

const ADJUST_TYPES = [
  { value: 'IN', label: 'Nhập kho (IN)', hint: 'Cộng thêm vào tồn hiện tại' },
  { value: 'OUT', label: 'Xuất kho (OUT)', hint: 'Trừ khỏi tồn, tối đa bằng tồn khả dụng' },
  { value: 'SET', label: 'Kiểm kê (SET)', hint: 'Đặt lại tồn hiện tại theo số đếm thực tế' },
  { value: 'RESERVE', label: 'Giữ chỗ (RESERVE)', hint: 'Tăng số lượng đang giữ chỗ' },
  { value: 'RELEASE', label: 'Hủy giữ chỗ (RELEASE)', hint: 'Giảm số lượng đang giữ chỗ' },
];

/** Tính tồn / giữ chỗ sau điều chỉnh để xem trước (khớp quy tắc backend). */
function preview(item, type, qty) {
  const q = Number(qty);
  if (!Number.isFinite(q) || qty === '') return null;
  let current = item.currentStock;
  let reserved = item.reservedStock;
  if (type === 'IN') current += q;
  else if (type === 'OUT') current -= q;
  else if (type === 'SET') current = q;
  else if (type === 'RESERVE') reserved += q;
  else if (type === 'RELEASE') reserved -= q;
  return { current, reserved, available: Math.max(0, current - reserved) };
}

/**
 * Modal tồn kho với 3 chế độ:
 *  - add:      khai báo tồn kho mới (chỉ chọn sản phẩm ACTIVE và kho ACTIVE)
 *  - adjust:   điều chỉnh số lượng (IN / OUT / SET / RESERVE / RELEASE) qua POST /{id}/adjust
 *  - location: đổi vị trí lưu kho qua PUT /{id}
 */
export default function InventoryModal({ modal, form, setForm, errors, isSaving, products, warehouses, onClose, onSave }) {
  if (!modal.open) return null;
  const { mode, data: item } = modal;

  const isActive = (s) => String(s || '').toUpperCase() === 'ACTIVE';
  const activeProducts = products.filter((p) => isActive(p.status));
  const activeWarehouses = warehouses.filter((w) => isActive(w.status));

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const err = (k) => errors[k] && <span className="text-error text-[12px]">{errors[k]}</span>;

  const title = {
    add: 'Khai báo tồn kho mới',
    adjust: `Điều chỉnh tồn: ${item?.productSku} @ ${item?.warehouseCode}`,
    location: `Vị trí lưu kho: ${item?.productSku} @ ${item?.warehouseCode}`,
  }[mode];
  const saveLabel = { add: 'Lưu tồn kho', adjust: 'Xác nhận điều chỉnh', location: 'Cập nhật vị trí' }[mode];

  const adj = mode === 'adjust' ? preview(item, form.adjustmentType, form.quantity) : null;
  const adjHint = ADJUST_TYPES.find((t) => t.value === form.adjustmentType)?.hint;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-space-lg border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary-container text-primary">
              <span className="material-symbols-outlined text-[20px]">{mode === 'adjust' ? 'tune' : mode === 'location' ? 'edit_location_alt' : 'shelves'}</span>
            </span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-high" aria-label="Đóng">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-space-lg flex flex-col gap-4 overflow-y-auto">
          {errors.general && (
            <div className="p-3 rounded-lg bg-error-container text-error text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errors.general}</span>
            </div>
          )}

          {mode === 'add' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="font-label-default text-on-surface font-body-sm-medium">Sản phẩm <span className="text-error">*</span></label>
                <select id="inventory-form-product" value={form.productId} onChange={set('productId')} className={`${FIELD} ${errors.productId ? 'border-error' : OK}`}>
                  <option value="">-- Chọn sản phẩm (đang kinh doanh) --</option>
                  {activeProducts.map((p) => (
                    <option key={p.id} value={String(p.id)}>{p.sku} - {p.name}</option>
                  ))}
                </select>
                {err('productId')}
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-default text-on-surface font-body-sm-medium">Kho <span className="text-error">*</span></label>
                <select id="inventory-form-warehouse" value={form.warehouseId} onChange={set('warehouseId')} className={`${FIELD} ${errors.warehouseId ? 'border-error' : OK}`}>
                  <option value="">-- Chọn kho (chỉ kho đang hoạt động) --</option>
                  {activeWarehouses.map((w) => (
                    <option key={w.id} value={String(w.id)}>{w.code} - {w.name}</option>
                  ))}
                </select>
                {err('warehouseId')}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-label-default text-on-surface font-body-sm-medium">Tồn ban đầu</label>
                  <input id="inventory-form-initial" type="number" min="0" step="1" value={form.initialStock} onChange={set('initialStock')} placeholder="0" className={`${FIELD} font-code-mono ${errors.initialStock ? 'border-error' : OK}`} />
                  {err('initialStock')}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-default text-on-surface font-body-sm-medium">Tồn giữ chỗ</label>
                  <input id="inventory-form-reserved" type="number" min="0" step="1" value={form.reservedStock} onChange={set('reservedStock')} className={`${FIELD} font-code-mono ${errors.reservedStock ? 'border-error' : OK}`} />
                  {err('reservedStock')}
                </div>
              </div>
            </>
          )}

          {mode === 'adjust' && (
            <>
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-surface-container-low text-center font-code-mono text-[13px]">
                <div><div className="text-[11px] text-secondary font-body-sm">Tồn hiện tại</div><b>{item.currentStock}</b></div>
                <div><div className="text-[11px] text-secondary font-body-sm">Giữ chỗ</div><b>{item.reservedStock}</b></div>
                <div><div className="text-[11px] text-secondary font-body-sm">Khả dụng</div><b>{item.availableStock}</b></div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-default text-on-surface font-body-sm-medium">Loại điều chỉnh <span className="text-error">*</span></label>
                <select id="inventory-form-type" value={form.adjustmentType} onChange={set('adjustmentType')} className={`${FIELD} ${OK}`}>
                  {ADJUST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <span className="text-[12px] text-secondary">{adjHint}</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-default text-on-surface font-body-sm-medium">Số lượng <span className="text-error">*</span></label>
                <input id="inventory-form-quantity" type="number" min="0" step="1" value={form.quantity} onChange={set('quantity')} placeholder="VD: 20" className={`${FIELD} font-code-mono ${errors.quantity ? 'border-error' : OK}`} />
                {err('quantity')}
                {adj && (
                  <span className="text-[12px] text-secondary">
                    Sau điều chỉnh: tồn <b>{adj.current}</b> · giữ chỗ <b>{adj.reserved}</b> · khả dụng <b>{adj.available}</b>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-label-default text-on-surface font-body-sm-medium">Lý do</label>
                  <input id="inventory-form-reason" type="text" maxLength={255} value={form.reason} onChange={set('reason')} placeholder="VD: Nhập hàng NCC" className={`${FIELD} ${errors.reason ? 'border-error' : OK}`} />
                  {err('reason')}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-default text-on-surface font-body-sm-medium">Mã chứng từ</label>
                  <input id="inventory-form-ref" type="text" maxLength={50} value={form.referenceDoc} onChange={set('referenceDoc')} placeholder="VD: PO-0001" className={`${FIELD} font-code-mono ${errors.referenceDoc ? 'border-error' : OK}`} />
                  {err('referenceDoc')}
                </div>
              </div>
            </>
          )}

          {(mode === 'add' || mode === 'location') && (
            <div className="flex flex-col gap-1">
              <label className="font-label-default text-on-surface font-body-sm-medium">Vị trí trong kho</label>
              <input id="inventory-form-location" type="text" maxLength={50} value={form.locationInWarehouse} onChange={set('locationInWarehouse')} placeholder="VD: A1-02-03 (Dãy-Kệ-Tầng)" className={`${FIELD} font-code-mono ${errors.locationInWarehouse ? 'border-error' : OK}`} />
              {err('locationInWarehouse')}
            </div>
          )}
        </div>

        <div className="px-space-lg py-space-md bg-surface-container-low flex items-center justify-end gap-space-sm border-t border-outline-variant/20">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-surface-container text-on-surface font-body-sm-medium rounded-lg hover:bg-surface-container-high transition-colors">
            Hủy bỏ
          </button>
          <button type="button" id="btn-save-inventory" disabled={isSaving} onClick={onSave} className="px-5 py-2 bg-primary text-on-primary font-body-sm-medium rounded-lg hover:opacity-90 transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-60">
            {isSaving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
            <span>{saveLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
