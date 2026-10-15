import React from 'react';
import { STOCK_STATUS } from '../../components/inventory/StockStatusBadge';

export default function StockMovementForm({
  isReceiving,
  products,
  warehouses,
  form,
  errors,
  isSubmitting,
  currentInventory,
  selectedProduct,
  selectedWarehouse,
  previewStock,
  onUpdateField,
  onSubmit,
  onReset,
}) {
  const currentStock = currentInventory ? Number(currentInventory.currentStock || 0) : 0;
  const availableStock = currentInventory ? Number(currentInventory.availableStock || 0) : 0;
  const reservedStock = currentInventory ? Number(currentInventory.reservedStock || 0) : 0;

  return (
    <form onSubmit={onSubmit} className="rounded-2xl bg-surface-container-lowest p-space-xl shadow-sm border border-outline-variant flex flex-col gap-6">
      {/* Tiêu đề form */}
      <div className="flex items-center justify-between pb-4 border-b border-outline-variant/40">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isReceiving ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}
          >
            <span className="material-symbols-outlined text-[28px]">
              {isReceiving ? 'move_to_inbox' : 'outbox'}
            </span>
          </div>
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">
              {isReceiving ? 'Thông tin phiếu nhập kho (Inbound)' : 'Thông tin phiếu xuất kho (Outbound)'}
            </h2>
            <p className="font-body-sm text-body-sm text-secondary">
              {isReceiving
                ? 'Ghi nhận hàng hóa nhập từ nhà cung cấp hoặc bổ sung nguồn hàng'
                : 'Xuất hàng phân phối, điều chuyển hoặc bàn giao theo đơn đặt'}
            </p>
          </div>
        </div>
      </div>

      {/* Lỗi chung từ backend nếu có */}
      {errors.general && (
        <div className="p-3.5 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <span>{errors.general}</span>
        </div>
      )}

      {/* Grid các trường nhập liệu */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {/* Chọn kho */}
        <div>
          <label htmlFor="field-warehouse" className="block font-label-default text-label-default text-on-surface mb-1.5 font-medium">
            Kho hàng <span className="text-error">*</span>
          </label>
          <select
            id="field-warehouse"
            value={form.warehouseId}
            onChange={(e) => onUpdateField('warehouseId', e.target.value)}
            className={`w-full h-11 px-3.5 rounded-xl border bg-surface text-on-surface font-body-sm text-body-sm outline-none transition-colors ${
              errors.warehouseId ? 'border-error ring-1 ring-error' : 'border-outline-variant focus:border-primary'
            }`}
          >
            <option value="">-- Chọn chi nhánh kho --</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id} disabled={w.status !== 'ACTIVE'}>
                {w.code} - {w.name} {w.status !== 'ACTIVE' ? `(${w.status})` : ''}
              </option>
            ))}
          </select>
          {errors.warehouseId && <p className="mt-1 text-label-sm text-error">{errors.warehouseId}</p>}
        </div>

        {/* Chọn sản phẩm */}
        <div>
          <label htmlFor="field-product" className="block font-label-default text-label-default text-on-surface mb-1.5 font-medium">
            Sản phẩm (SKU) <span className="text-error">*</span>
          </label>
          <select
            id="field-product"
            value={form.productId}
            onChange={(e) => onUpdateField('productId', e.target.value)}
            className={`w-full h-11 px-3.5 rounded-xl border bg-surface text-on-surface font-body-sm text-body-sm outline-none transition-colors ${
              errors.productId ? 'border-error ring-1 ring-error' : 'border-outline-variant focus:border-primary'
            }`}
          >
            <option value="">-- Chọn sản phẩm SKU --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} - {p.name} ({p.unit || 'đơn vị'})
              </option>
            ))}
          </select>
          {errors.productId && <p className="mt-1 text-label-sm text-error">{errors.productId}</p>}
        </div>

        {/* Số lượng */}
        <div>
          <label htmlFor="field-quantity" className="block font-label-default text-label-default text-on-surface mb-1.5 font-medium">
            {isReceiving ? 'Số lượng nhập' : 'Số lượng xuất'} <span className="text-error">*</span>
          </label>
          <div className="relative">
            <input
              id="field-quantity"
              type="number"
              min="1"
              step="1"
              placeholder="Nhập số lượng..."
              value={form.quantity}
              onChange={(e) => onUpdateField('quantity', e.target.value)}
              className={`w-full h-11 px-3.5 rounded-xl border bg-surface text-on-surface font-body-sm text-body-sm outline-none transition-colors ${
                errors.quantity ? 'border-error ring-1 ring-error' : 'border-outline-variant focus:border-primary'
              }`}
            />
            {selectedProduct && (
              <span className="absolute right-3.5 top-3 text-secondary font-label-sm text-label-sm">
                {selectedProduct.unit || 'đơn vị'}
              </span>
            )}
          </div>
          {errors.quantity && <p className="mt-1 text-label-sm text-error">{errors.quantity}</p>}
        </div>

        {/* Mã chứng từ tham chiếu */}
        <div>
          <label htmlFor="field-ref-doc" className="block font-label-default text-label-default text-on-surface mb-1.5 font-medium">
            {isReceiving ? 'Mã chứng từ / Đơn đặt (PO)' : 'Mã phiếu xuất / Đơn hàng (SO)'}
          </label>
          <input
            id="field-ref-doc"
            type="text"
            maxLength={50}
            placeholder={isReceiving ? 'VD: PO-2026-0089' : 'VD: SO-2026-1142'}
            value={form.referenceDoc}
            onChange={(e) => onUpdateField('referenceDoc', e.target.value)}
            className={`w-full h-11 px-3.5 rounded-xl border bg-surface text-on-surface font-body-sm text-body-sm outline-none transition-colors ${
              errors.referenceDoc ? 'border-error ring-1 ring-error' : 'border-outline-variant focus:border-primary'
            }`}
          />
          {errors.referenceDoc && <p className="mt-1 text-label-sm text-error">{errors.referenceDoc}</p>}
        </div>

        {/* Vị trí trong kho (chỉ hiển thị khi Nhập mới) */}
        {isReceiving && previewStock.isNewRecord && (
          <div className="md:col-span-2">
            <label htmlFor="field-location" className="block font-label-default text-label-default text-on-surface mb-1.5 font-medium">
              Vị trí lưu kho ban đầu (Kệ / Tầng / Ô)
            </label>
            <input
              id="field-location"
              type="text"
              maxLength={50}
              placeholder="VD: Kệ A-02, Tầng 3"
              value={form.locationInWarehouse}
              onChange={(e) => onUpdateField('locationInWarehouse', e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-outline-variant bg-surface text-on-surface font-body-sm text-body-sm outline-none focus:border-primary transition-colors"
            />
            <p className="mt-1 text-label-sm text-secondary">
              Sản phẩm này chưa từng có bản ghi tại kho đang chọn. Hệ thống sẽ tự động khởi tạo dòng tồn mới.
            </p>
          </div>
        )}

        {/* Ghi chú / Lý do */}
        <div className="md:col-span-2">
          <label htmlFor="field-reason" className="block font-label-default text-label-default text-on-surface mb-1.5 font-medium">
            Lý do / Ghi chú diễn giải
          </label>
          <textarea
            id="field-reason"
            rows="2"
            maxLength={255}
            placeholder={
              isReceiving
                ? 'VD: Nhập bổ sung định kỳ theo hợp đồng cung ứng số #12...'
                : 'VD: Xuất phục vụ đơn bán buôn cho đại lý miền Nam...'
            }
            value={form.reason}
            onChange={(e) => onUpdateField('reason', e.target.value)}
            className="w-full p-3.5 rounded-xl border border-outline-variant bg-surface text-on-surface font-body-sm text-body-sm outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Card xem trước biến động tồn (Stock Simulation Card) */}
      {selectedProduct && selectedWarehouse && (
        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/60 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-label-default text-label-default text-secondary uppercase tracking-wider font-bold">
              Dự báo biến động tồn kho
            </span>
            <span className="font-code-mono text-body-sm text-primary font-bold">
              {selectedProduct.sku} @ {selectedWarehouse.code}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-surface-container-lowest">
              <span className="font-label-sm text-label-sm text-secondary block">Tồn kho hiện tại</span>
              <span className="font-display text-[20px] font-bold text-on-surface">
                {currentStock.toLocaleString('vi-VN')} {selectedProduct.unit}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-surface-container-lowest">
              <span className="font-label-sm text-label-sm text-secondary block">Tồn khả dụng xuất</span>
              <span className="font-display text-[20px] font-bold text-on-surface">
                {availableStock.toLocaleString('vi-VN')} {selectedProduct.unit}
              </span>
              {reservedStock > 0 && (
                <span className="text-[11px] text-amber-600 block">(Đang giữ: {reservedStock})</span>
              )}
            </div>

            <div className="p-3 rounded-lg bg-surface-container-lowest">
              <span className="font-label-sm text-label-sm text-secondary block">
                {isReceiving ? 'Số lượng nhập vào' : 'Số lượng xuất đi'}
              </span>
              <span
                className={`font-display text-[20px] font-bold ${
                  isReceiving ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {isReceiving ? '+' : '-'}
                {Number(form.quantity || 0).toLocaleString('vi-VN')} {selectedProduct.unit}
              </span>
            </div>

            <div
              className={`p-3 rounded-lg ${
                isReceiving ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
              }`}
            >
              <span className="font-label-sm text-label-sm text-secondary block">Tồn dự kiến sau khi duyệt</span>
              <span
                className={`font-display text-[20px] font-bold ${
                  isReceiving ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {previewStock.afterStock.toLocaleString('vi-VN')} {selectedProduct.unit}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/40">
        <button
          type="button"
          onClick={onReset}
          disabled={isSubmitting}
          className="px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium hover:bg-surface-container-high transition-colors"
        >
          Làm lại
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-body-sm-medium text-body-sm-medium text-white shadow-sm transition-all ${
            isReceiving
              ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300'
              : 'bg-primary hover:bg-primary-container disabled:bg-primary-fixed'
          }`}
        >
          {isSubmitting && <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>}
          <span>{isSubmitting ? 'Đang xử lý...' : isReceiving ? 'Xác nhận Nhập kho' : 'Xác nhận Xuất kho'}</span>
        </button>
      </div>
    </form>
  );
}
