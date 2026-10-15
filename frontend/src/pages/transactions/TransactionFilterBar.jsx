import React from 'react';
import { TRANSACTION_TYPES } from '../../components/inventory/TransactionTypeBadge';

export default function TransactionFilterBar({
  type,
  onType,
  warehouses = [],
  warehouseId,
  onWarehouse,
  products = [],
  productId,
  onProduct,
  search,
  onSearch,
  hasActiveFilter,
  onReset,
}) {
  return (
    <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm border border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
      {/* Tìm kiếm */}
      <div className="relative flex-1 min-w-[260px]">
        <span className="material-symbols-outlined absolute left-3 top-2.5 text-secondary text-[20px]">
          search
        </span>
        <input
          type="text"
          placeholder="Tìm theo mã giao dịch, số chứng từ, lý do..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-3 rounded-xl border border-outline-variant bg-surface text-on-surface font-body-sm text-body-sm outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Các dropdown lọc */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Lọc loại giao dịch */}
        <select
          value={type}
          onChange={(e) => onType(e.target.value)}
          className="h-10 px-3 rounded-xl border border-outline-variant bg-surface text-on-surface font-body-sm text-body-sm outline-none focus:border-primary"
        >
          <option value="all">Tất cả loại giao dịch</option>
          {Object.entries(TRANSACTION_TYPES).map(([k, cfg]) => (
            <option key={k} value={k}>
              {cfg.label} ({cfg.english})
            </option>
          ))}
        </select>

        {/* Lọc kho */}
        <select
          value={warehouseId}
          onChange={(e) => onWarehouse(e.target.value)}
          className="h-10 px-3 rounded-xl border border-outline-variant bg-surface text-on-surface font-body-sm text-body-sm outline-none focus:border-primary"
        >
          <option value="all">Tất cả kho hàng</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.code} - {w.name}
            </option>
          ))}
        </select>

        {/* Lọc sản phẩm */}
        <select
          value={productId}
          onChange={(e) => onProduct(e.target.value)}
          className="h-10 px-3 rounded-xl border border-outline-variant bg-surface text-on-surface font-body-sm text-body-sm outline-none focus:border-primary max-w-[200px]"
        >
          <option value="all">Tất cả sản phẩm</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} - {p.name}
            </option>
          ))}
        </select>

        {/* Nút reset */}
        {hasActiveFilter && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 h-10 px-3 rounded-xl border border-outline-variant text-secondary hover:text-on-surface hover:bg-surface-container transition-colors font-body-sm text-body-sm"
          >
            <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
            <span>Đặt lại</span>
          </button>
        )}
      </div>
    </div>
  );
}
