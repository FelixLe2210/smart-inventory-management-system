import { useEffect, useState } from 'react';

const ADJUSTMENT_TYPES = [
  { value: 'IN', label: 'Nhập kho', icon: 'south_west' },
  { value: 'OUT', label: 'Xuất kho', icon: 'north_east' },
  { value: 'SET', label: 'Kiểm kê / đặt tồn', icon: 'edit_note' },
  { value: 'RESERVE', label: 'Giữ hàng', icon: 'lock' },
  { value: 'RELEASE', label: 'Hủy giữ hàng', icon: 'lock_open' },
];

function formatDate(value) {
  if (!value) return 'Chưa có dữ liệu';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function InventoryDetailModal({ inventory, onClose, onAdjust, isSaving }) {
  const [adjustmentType, setAdjustmentType] = useState('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [referenceDoc, setReferenceDoc] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const submitAdjustment = async (event) => {
    event.preventDefault();
    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
      setError('Vui lòng nhập số lượng nguyên không âm.');
      return;
    }
    if (['IN', 'OUT', 'RESERVE', 'RELEASE'].includes(adjustmentType) && parsedQuantity === 0) {
      setError('Số lượng phải lớn hơn 0 cho loại điều chỉnh này.');
      return;
    }

    setError('');
    setSuccess('');
    try {
      await onAdjust(inventory.id, {
        adjustmentType,
        quantity: parsedQuantity,
        reason: reason.trim() || null,
        referenceDoc: referenceDoc.trim() || null,
      });
      setQuantity('');
      setReason('');
      setReferenceDoc('');
      setSuccess('Đã cập nhật tồn kho thành công.');
    } catch (err) {
      setError(err.message || 'Không thể điều chỉnh tồn kho.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="inventory-detail-title"
        aria-modal="true"
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface-container-lowest shadow-2xl"
        role="dialog"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-outline-variant bg-surface-container-lowest px-6 py-5">
          <div>
            <p className="font-code-mono text-code-mono font-semibold text-primary">{inventory.productSku}</p>
            <h2 id="inventory-detail-title" className="mt-1 font-headline-md text-headline-md text-on-surface">
              {inventory.productName}
            </h2>
            <p className="mt-1 text-body-sm text-secondary">
              {inventory.warehouseCode} · {inventory.warehouseName}
            </p>
          </div>
          <button
            aria-label="Đóng chi tiết"
            className="rounded-lg p-2 text-secondary hover:bg-surface-container-high"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Tồn hiện tại', inventory.currentStock],
                ['Đang giữ', inventory.reservedStock],
                ['Có thể xuất', inventory.availableStock],
              ].map(([label, value]) => (
                <div className="rounded-xl bg-surface-container-low p-4" key={label}>
                  <p className="text-label-default text-secondary">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-on-surface">
                    {Number(value ?? 0).toLocaleString('vi-VN')}
                  </p>
                  <p className="text-label-sm text-secondary">{inventory.productUnit || 'đơn vị'}</p>
                </div>
              ))}
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-outline-variant p-4 text-body-sm">
              <dt className="text-secondary">Vị trí trong kho</dt>
              <dd className="text-right font-medium text-on-surface">{inventory.locationInWarehouse || 'Chưa cập nhật'}</dd>
              <dt className="text-secondary">Định mức tối thiểu</dt>
              <dd className="text-right font-medium text-on-surface">{inventory.minStockLevel ?? '—'}</dd>
              <dt className="text-secondary">Định mức tối đa</dt>
              <dd className="text-right font-medium text-on-surface">{inventory.maxStockLevel ?? '—'}</dd>
              <dt className="text-secondary">Kiểm kê gần nhất</dt>
              <dd className="text-right font-medium text-on-surface">{formatDate(inventory.lastStockCountAt)}</dd>
              <dt className="text-secondary">Cập nhật gần nhất</dt>
              <dd className="text-right font-medium text-on-surface">{formatDate(inventory.updatedAt)}</dd>
            </dl>
          </div>

          <form className="space-y-4 rounded-xl bg-surface-container-low p-5" onSubmit={submitAdjustment}>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Điều chỉnh tồn kho</h3>
              <p className="mt-1 text-body-sm text-secondary">Thao tác sẽ cập nhật số lượng trực tiếp trên hệ thống.</p>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-label-default font-medium text-on-surface">Loại điều chỉnh</span>
              <select
                className="h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-body-sm outline-none focus:border-primary"
                onChange={(event) => setAdjustmentType(event.target.value)}
                value={adjustmentType}
              >
                {ADJUSTMENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-label-default font-medium text-on-surface">
                {adjustmentType === 'SET' ? 'Số lượng tồn mới' : 'Số lượng'}
              </span>
              <input
                className="h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-body-sm outline-none focus:border-primary"
                min="0"
                onChange={(event) => setQuantity(event.target.value)}
                required
                type="number"
                value={quantity}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-label-default font-medium text-on-surface">Lý do</span>
              <input
                className="h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-body-sm outline-none focus:border-primary"
                maxLength={255}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ví dụ: kiểm kê định kỳ"
                value={reason}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-label-default font-medium text-on-surface">Mã chứng từ</span>
              <input
                className="h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-body-sm outline-none focus:border-primary"
                maxLength={50}
                onChange={(event) => setReferenceDoc(event.target.value)}
                placeholder="Không bắt buộc"
                value={referenceDoc}
              />
            </label>

            {error && <p className="rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container" role="alert">{error}</p>}
            {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-body-sm text-emerald-800" role="status">{success}</p>}
            <button
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-body-sm-medium text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
              {isSaving ? 'Đang cập nhật...' : 'Lưu điều chỉnh'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
