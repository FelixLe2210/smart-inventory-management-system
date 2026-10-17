import React from 'react';
import { Link } from 'react-router-dom';

const fmt = (n) => Number(n || 0).toLocaleString('vi-VN');
const inputBase =
  'w-full h-11 px-3.5 rounded-xl border bg-surface text-on-surface font-body-sm text-body-sm outline-none transition-colors';
const fieldClass = (hasError) =>
  `${inputBase} ${hasError ? 'border-error ring-1 ring-error' : 'border-outline-variant focus:border-primary'}`;

/**
 * StockTransferForm - Form phiếu chuyển kho (Sprint5-13)
 * Mọi quy tắc nghiệp vụ nằm ở utils/stockTransfer.js và backend; form chỉ hiển thị.
 */
export default function StockTransferForm({
  products,
  sourceOptions,
  destinationOptions,
  form,
  errors,
  submitError,
  isSubmitting,
  selectedProduct,
  sourceInventory,
  destinationInventory,
  destinationWarehouse,
  preview,
  onUpdateField,
  onFillAll,
  onSubmit,
  onReset,
}) {
  const unit = selectedProduct?.unit || sourceInventory?.productUnit || 'đơn vị';
  const available = sourceInventory ? Number(sourceInventory.availableStock || 0) : 0;
  const minLevel = sourceInventory ? Number(sourceInventory.minStockLevel || 0) : 0;
  const showPreview = sourceInventory && destinationWarehouse;
  const belowMin = showPreview && preview.quantity > 0 && minLevel > 0 && preview.sourceAfter < minLevel;

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl bg-surface-container-lowest p-space-xl shadow-sm border border-outline-variant flex flex-col gap-6"
    >
      <div className="flex items-center gap-3 pb-4 border-b border-outline-variant/40">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600">
          <span className="material-symbols-outlined text-[28px]">swap_horiz</span>
        </div>
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Thông tin phiếu chuyển kho (Transfer)</h2>
          <p className="font-body-sm text-body-sm text-secondary">
            Chuyển hàng giữa hai chi nhánh. Tồn kho nguồn giảm, tồn kho đích tăng trong cùng một giao dịch.
          </p>
        </div>
      </div>

      {errors.general && (
        <div className="p-3.5 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm flex items-start gap-2" role="alert">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <div className="flex-1">
            <span>{errors.general}</span>
            {submitError && submitError.retryable && (
              <button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitting}
                className="ml-3 underline font-body-sm-medium disabled:opacity-60"
              >
                Thử lại
              </button>
            )}
            {submitError && submitError.relogin && (
              <Link to="/login" className="ml-3 underline font-body-sm-medium">Đăng nhập lại</Link>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {/* Sản phẩm */}
        <div className="md:col-span-2">
          <label htmlFor="tf-product" className="block font-label-default text-label-default text-on-surface mb-1.5 font-medium">
            Sản phẩm (SKU) <span className="text-error">*</span>
          </label>
          <select
            id="tf-product"
            value={form.productId}
            onChange={(e) => onUpdateField('productId', e.target.value)}
            className={fieldClass(errors.productId)}
          >
            <option value="">-- Chọn sản phẩm đang có tồn --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} - {p.name} ({p.unit || 'đơn vị'})
              </option>
            ))}
          </select>
          {errors.productId && <p className="mt-1 text-label-sm text-error">{errors.productId}</p>}
          {products.length === 0 && (
            <p className="mt-1 text-label-sm text-secondary">
              Chưa có sản phẩm nào còn tồn khả dụng để chuyển. Hãy nhập kho trước tại{' '}
              <Link to="/inbound" className="text-primary underline">Phiếu Nhập kho</Link>.
            </p>
          )}
        </div>

        {/* Kho nguồn */}
        <div>
          <label htmlFor="tf-source" className="block font-label-default text-label-default text-on-surface mb-1.5 font-medium">
            Kho nguồn (xuất đi) <span className="text-error">*</span>
          </label>
          <select
            id="tf-source"
            value={form.sourceWarehouseId}
            onChange={(e) => onUpdateField('sourceWarehouseId', e.target.value)}
            disabled={!form.productId}
            className={`${fieldClass(errors.sourceWarehouseId)} disabled:opacity-60`}
          >
            <option value="">{form.productId ? '-- Chọn kho nguồn --' : '-- Chọn sản phẩm trước --'}</option>
            {sourceOptions.map((i) => (
              <option key={i.id} value={i.warehouseId}>
                {i.warehouseCode} - {i.warehouseName} (khả dụng: {fmt(i.availableStock)})
              </option>
            ))}
          </select>
          {errors.sourceWarehouseId && <p className="mt-1 text-label-sm text-error">{errors.sourceWarehouseId}</p>}
        </div>

        {/* Kho đích */}
        <div>
          <label htmlFor="tf-destination" className="block font-label-default text-label-default text-on-surface mb-1.5 font-medium">
            Kho đích (nhận về) <span className="text-error">*</span>
          </label>
          <select
            id="tf-destination"
            value={form.destinationWarehouseId}
            onChange={(e) => onUpdateField('destinationWarehouseId', e.target.value)}
            disabled={!form.sourceWarehouseId}
            className={`${fieldClass(errors.destinationWarehouseId)} disabled:opacity-60`}
          >
            <option value="">{form.sourceWarehouseId ? '-- Chọn kho đích --' : '-- Chọn kho nguồn trước --'}</option>
            {destinationOptions.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} - {w.name}
              </option>
            ))}
          </select>
          {errors.destinationWarehouseId && <p className="mt-1 text-label-sm text-error">{errors.destinationWarehouseId}</p>}
          {form.sourceWarehouseId && destinationOptions.length === 0 && (
            <p className="mt-1 text-label-sm text-secondary">Không có kho đích nào đang hoạt động (ACTIVE) khác kho nguồn.</p>
          )}
        </div>

        {/* Số lượng */}
        <div>
          <label htmlFor="tf-quantity" className="block font-label-default text-label-default text-on-surface mb-1.5 font-medium">
            Số lượng chuyển <span className="text-error">*</span>
          </label>
          <div className="relative">
            <input
              id="tf-quantity"
              type="number"
              min="1"
              max={sourceInventory ? available : undefined}
              step="1"
              placeholder="Nhập số lượng..."
              value={form.quantity}
              onChange={(e) => onUpdateField('quantity', e.target.value)}
              className={`${fieldClass(errors.quantity)} pr-24`}
            />
            <span className="absolute right-3.5 top-3 text-secondary font-label-sm text-label-sm">{unit}</span>
          </div>
          {errors.quantity && <p className="mt-1 text-label-sm text-error">{errors.quantity}</p>}
          {sourceInventory && (
            <p className="mt-1 text-label-sm text-secondary">
              Tối đa {fmt(available)} {unit}
              {Number(sourceInventory.reservedStock || 0) > 0 && ` (đang giữ chỗ ${fmt(sourceInventory.reservedStock)})`}.{' '}
              <button type="button" onClick={onFillAll} className="text-primary underline">
                Chuyển toàn bộ khả dụng
              </button>
            </p>
          )}
        </div>

        {/* Mã chứng từ */}
        <div>
          <label htmlFor="tf-ref" className="block font-label-default text-label-default text-on-surface mb-1.5 font-medium">
            Mã phiếu chuyển / Chứng từ
          </label>
          <input
            id="tf-ref"
            type="text"
            maxLength={50}
            placeholder="VD: TRF-2026-0031"
            value={form.referenceDoc}
            onChange={(e) => onUpdateField('referenceDoc', e.target.value)}
            className={fieldClass(errors.referenceDoc)}
          />
          {errors.referenceDoc && <p className="mt-1 text-label-sm text-error">{errors.referenceDoc}</p>}
        </div>

        {/* Lý do */}
        <div className="md:col-span-2">
          <label htmlFor="tf-reason" className="block font-label-default text-label-default text-on-surface mb-1.5 font-medium">
            Lý do / Ghi chú
          </label>
          <textarea
            id="tf-reason"
            rows="2"
            maxLength={255}
            placeholder="VD: Cân đối tồn kho giữa hai chi nhánh theo đề xuất của quản lý..."
            value={form.reason}
            onChange={(e) => onUpdateField('reason', e.target.value)}
            className={`w-full p-3.5 rounded-xl border bg-surface text-on-surface font-body-sm text-body-sm outline-none transition-colors ${
              errors.reason ? 'border-error ring-1 ring-error' : 'border-outline-variant focus:border-primary'
            }`}
          />
          {errors.reason && <p className="mt-1 text-label-sm text-error">{errors.reason}</p>}
        </div>
      </div>

      {/* Xem trước tồn hai kho */}
      {showPreview && (
        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/60 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-label-default text-label-default text-secondary uppercase tracking-wider font-bold">
              Dự kiến tồn kho sau khi chuyển
            </span>
            <span className="font-code-mono text-body-sm text-primary font-bold">{sourceInventory.productSku}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <span className="font-label-sm text-label-sm text-secondary block">
                Kho nguồn: {sourceInventory.warehouseCode}
              </span>
              <span className="font-display text-[20px] font-bold text-red-700">
                {fmt(preview.sourceBefore)} ➔ {fmt(preview.sourceAfter)} {unit}
              </span>
              {preview.quantity > 0 && (
                <span className="text-[11px] text-red-600 block">-{fmt(preview.quantity)}</span>
              )}
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="font-label-sm text-label-sm text-secondary block">
                Kho đích: {destinationWarehouse.code}
              </span>
              <span className="font-display text-[20px] font-bold text-emerald-700">
                {fmt(preview.destinationBefore)} ➔ {fmt(preview.destinationAfter)} {unit}
              </span>
              {preview.quantity > 0 && (
                <span className="text-[11px] text-emerald-600 block">+{fmt(preview.quantity)}</span>
              )}
            </div>
          </div>
          {!destinationInventory && (
            <p className="text-label-sm text-secondary">
              Sản phẩm chưa có dòng tồn tại kho đích, hệ thống sẽ tự tạo khi chuyển.
            </p>
          )}
          {belowMin && (
            <p className="text-label-sm text-amber-700 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">warning</span>
              Sau khi chuyển, kho nguồn sẽ xuống dưới mức tồn tối thiểu ({fmt(minLevel)} {unit}).
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/40">
        <button
          type="button"
          onClick={onReset}
          disabled={isSubmitting}
          className="px-4 py-2.5 rounded-xl bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium hover:bg-surface-container-high transition-colors disabled:opacity-60"
        >
          Làm lại
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm-medium text-body-sm-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          <span className={`material-symbols-outlined text-[18px] ${isSubmitting ? 'animate-spin' : ''}`}>
            {isSubmitting ? 'progress_activity' : 'swap_horiz'}
          </span>
          {isSubmitting ? 'Đang chuyển kho...' : 'Xác nhận chuyển kho'}
        </button>
      </div>
    </form>
  );
}
