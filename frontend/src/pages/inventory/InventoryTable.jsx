import StockStatusBadge, { STOCK_STATUS } from '../../components/inventory/StockStatusBadge';

function fmtDate(value) {
  if (!value) return '---';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '---' : d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

/** Thanh mức tồn so với ngưỡng Max, vạch đứng là mức Min; màu theo trạng thái. */
function StockBar({ item }) {
  const max = Math.max(item.maxStockLevel || 0, item.currentStock || 0, 1);
  const pct = Math.min(100, Math.round(((item.currentStock || 0) / max) * 100));
  const minPct = Math.min(100, Math.round(((item.minStockLevel || 0) / max) * 100));
  const cfg = STOCK_STATUS[item.stockStatus] || STOCK_STATUS.IN_STOCK;
  return (
    <div className="flex flex-col gap-1 min-w-[140px]">
      <div className="flex items-baseline gap-1">
        <span className="font-code-mono font-bold text-on-surface text-[15px]">
          {Number(item.currentStock).toLocaleString('vi-VN')}
        </span>
        <span className="text-[11px] text-secondary">{item.productUnit || ''}</span>
      </div>
      <div
        className="relative w-full h-1.5 rounded-full bg-secondary-container overflow-hidden"
        title={`Min ${item.minStockLevel} · Max ${item.maxStockLevel}`}
      >
        <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${pct}%` }} />
        <div className="absolute top-0 bottom-0 w-px bg-on-surface/50" style={{ left: `${minPct}%` }} />
      </div>
      <span className="text-[11px] text-secondary font-code-mono">Min {item.minStockLevel} ~ Max {item.maxStockLevel}</span>
    </div>
  );
}

/** Bảng tồn kho (Sprint4-13). */
export default function InventoryTable({ items, total, isLoading, loadError, onAdjust, onEditLocation, onRetry }) {
  return (
    <div className="rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant overflow-hidden flex flex-col">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low/70 text-secondary font-label-default text-label-default uppercase tracking-wider border-b border-outline-variant/40">
              <th className="py-3 px-4 min-w-[200px]">Sản phẩm</th>
              <th className="py-3 px-4 min-w-[180px]">Kho</th>
              <th className="py-3 px-4 min-w-[170px]">Tồn hiện tại</th>
              <th className="py-3 px-4 min-w-[120px]">Giữ chỗ / Khả dụng</th>
              <th className="py-3 px-4 min-w-[110px]">Vị trí</th>
              <th className="py-3 px-4 min-w-[140px]">Trạng thái tồn</th>
              <th className="py-3 px-4 min-w-[130px]">Cập nhật</th>
              <th className="py-3 px-4 text-right min-w-[90px]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="font-body-sm text-body-sm text-on-surface divide-y divide-outline-variant/30">
            {loadError && items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-secondary">
                  <span className="material-symbols-outlined text-[32px] text-error">cloud_off</span>
                  <p className="font-body-sm-medium text-on-surface mt-2">{loadError}</p>
                  <button type="button" onClick={onRetry} className="mt-3 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface">
                    Thử lại
                  </button>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-secondary">
                  <div className="w-16 h-16 rounded-2xl bg-surface-container-low text-secondary mx-auto flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[32px] opacity-60">{isLoading ? 'hourglass_top' : 'search_off'}</span>
                  </div>
                  <p className="font-body-sm-medium text-on-surface">
                    {isLoading ? 'Đang tải dữ liệu tồn kho...' : 'Không có bản ghi tồn kho phù hợp'}
                  </p>
                  {!isLoading && (
                    <p className="text-secondary text-body-sm mt-1 max-w-sm mx-auto">
                      Thử đặt lại bộ lọc hoặc khai báo tồn kho mới cho sản phẩm tại một kho.
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.id} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-code-mono font-bold text-primary">{it.productSku}</span>
                      <span className="text-on-surface">{it.productName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-code-mono font-bold text-on-surface">{it.warehouseCode}</span>
                      <span className="text-[12px] text-secondary">{it.warehouseName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4"><StockBar item={it} /></td>
                  <td className="py-3 px-4 font-code-mono text-[13px]">
                    <span className="text-secondary">{it.reservedStock}</span>
                    <span className="text-outline mx-1">/</span>
                    <span className="text-on-surface font-bold">{it.availableStock}</span>
                  </td>
                  <td className="py-3 px-4 font-code-mono text-[12px] text-secondary">{it.locationInWarehouse || '---'}</td>
                  <td className="py-3 px-4"><StockStatusBadge status={it.stockStatus} /></td>
                  <td className="py-3 px-4 text-[12px] text-secondary">{fmtDate(it.updatedAt)}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => onAdjust(it)}
                        title="Điều chỉnh tồn kho (nhập / xuất / kiểm kê / giữ chỗ)"
                        className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-container-high transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">tune</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditLocation(it)}
                        title="Đổi vị trí lưu kho"
                        className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-container-high transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit_location_alt</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-space-lg py-3 bg-surface-container-low/50 border-t border-outline-variant/30 flex items-center justify-between text-secondary font-label-default text-label-default">
        <span>Hiển thị <strong>{items.length}</strong> / <strong>{total}</strong> dòng tồn kho</span>
        <span className="text-outline">Trạng thái tính theo ngưỡng Min / Max của sản phẩm</span>
      </div>
    </div>
  );
}
