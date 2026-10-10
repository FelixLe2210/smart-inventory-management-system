import { STOCK_STATUS, STOCK_STATUS_KEYS } from '../../components/inventory/StockStatusBadge';

const SELECT_CLASS =
  'h-9 px-3 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm text-on-surface cursor-pointer border border-transparent focus:border-primary/30 max-w-[240px]';

/**
 * Thanh lọc tồn kho: kho / sản phẩm / trạng thái + tìm kiếm (Sprint4-14).
 */
export default function InventoryFilterBar({
  search, onSearch,
  warehouses, filterWarehouse, onWarehouse,
  products, filterProduct, onProduct,
  filterStatus, onStatus,
  hasActiveFilter, onReset,
}) {
  return (
    <div className="p-space-md bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/40 flex flex-col xl:flex-row items-center justify-between gap-3">
      <div className="relative flex items-center w-full xl:max-w-sm">
        <span className="material-symbols-outlined absolute left-3 text-secondary text-[18px]">search</span>
        <input
          id="inventory-search"
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Tìm theo SKU, tên sản phẩm, mã kho, vị trí..."
          className="w-full h-9 pl-9 pr-8 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm focus:bg-surface-container-lowest transition-colors border border-transparent focus:border-primary/30"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearch('')}
            className="absolute right-2.5 text-secondary hover:text-on-surface"
            aria-label="Xóa tìm kiếm"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
        <select id="filter-inventory-warehouse" value={filterWarehouse} onChange={(e) => onWarehouse(e.target.value)} className={SELECT_CLASS}>
          <option value="all">Tất cả kho</option>
          {warehouses.map((w) => (
            <option key={w.id} value={String(w.id)}>{w.code} - {w.name}</option>
          ))}
        </select>

        <select id="filter-inventory-product" value={filterProduct} onChange={(e) => onProduct(e.target.value)} className={SELECT_CLASS}>
          <option value="all">Tất cả sản phẩm</option>
          {products.map((p) => (
            <option key={p.id} value={String(p.id)}>{p.sku} - {p.name}</option>
          ))}
        </select>

        <select id="filter-inventory-status" value={filterStatus} onChange={(e) => onStatus(e.target.value)} className={SELECT_CLASS}>
          <option value="all">Tất cả trạng thái tồn</option>
          {STOCK_STATUS_KEYS.map((k) => (
            <option key={k} value={k}>{STOCK_STATUS[k].label} ({STOCK_STATUS[k].english})</option>
          ))}
        </select>

        {hasActiveFilter && (
          <button
            type="button"
            id="btn-reset-inventory-filter"
            onClick={onReset}
            className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-secondary text-body-sm transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
            <span>Đặt lại</span>
          </button>
        )}
      </div>
    </div>
  );
}
