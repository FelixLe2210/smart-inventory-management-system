import React from 'react';
import StockStatusBadge from '../../components/inventory/StockStatusBadge';
import DataSourceBadge from '../../components/common/DataSourceBadge';
import { INVENTORY_CSV_COLUMNS, INVENTORY_STATUS_LABELS, toCsv } from '../../utils/reports';
import { downloadTextFile, datedFilename } from '../../utils/downloadFile';
import { ReportStat, FilterPanel, Field, ExportButton, controlClass, fmtNumber, fmtCurrency } from './ReportShared';

const MAX_ROWS_SHOWN = 200;

/** Báo cáo tồn kho — Sprint6-14 (Report UI) */
export default function InventoryReportPanel({ reports }) {
  const { invFilters: f, updateInvFilter, resetInvFilters, invReport: report, invSource, warehouses, categories, isLoading } = reports;
  const { summary, rows } = report;

  const hasActiveFilter =
    f.warehouseId !== 'all' || f.categoryId !== 'all' || f.status !== 'all' || !!f.search;

  const handleExport = () => {
    downloadTextFile(datedFilename('bao-cao-ton-kho'), toCsv(INVENTORY_CSV_COLUMNS, rows));
  };

  return (
    <div className="flex flex-col gap-space-lg">
      <FilterPanel onReset={resetInvFilters} hasActiveFilter={hasActiveFilter}>
        <Field label="Tìm kiếm">
          <input
            type="text"
            placeholder="Tên hoặc SKU..."
            value={f.search}
            onChange={(e) => updateInvFilter({ search: e.target.value })}
            className={`${controlClass} min-w-[200px]`}
          />
        </Field>
        <Field label="Kho">
          <select value={f.warehouseId} onChange={(e) => updateInvFilter({ warehouseId: e.target.value })} className={controlClass}>
            <option value="all">Tất cả kho</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.code} - {w.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Danh mục">
          <select value={f.categoryId} onChange={(e) => updateInvFilter({ categoryId: e.target.value })} className={controlClass}>
            <option value="all">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Trạng thái tồn">
          <select value={f.status} onChange={(e) => updateInvFilter({ status: e.target.value })} className={controlClass}>
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(INVENTORY_STATUS_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </Field>
        <div className="ml-auto flex items-center gap-2">
          <DataSourceBadge source={invSource} />
          <ExportButton onClick={handleExport} disabled={rows.length === 0} />
        </div>
      </FilterPanel>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <ReportStat label="Dòng tồn kho" value={fmtNumber(summary.rowCount)} hint="Sản phẩm × kho" />
        <ReportStat label="Tổng tồn hiện tại" value={fmtNumber(summary.totalQuantity)} hint={`Khả dụng ${fmtNumber(summary.totalAvailable)} · Giữ chỗ ${fmtNumber(summary.totalReserved)}`} />
        <ReportStat label="Giá trị tồn kho" value={fmtCurrency(summary.totalValue)} hint="Tồn × giá vốn" />
        <ReportStat label="Sắp hết hàng" value={fmtNumber(summary.lowStockCount)} tone="text-amber-600" hint="Số dòng tồn kho" />
        <ReportStat label="Hết hàng" value={fmtNumber(summary.outOfStockCount)} tone="text-red-600" hint="Số dòng tồn kho" />
      </div>

      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-sm overflow-hidden">
        {isLoading && rows.length === 0 ? (
          <div className="p-10 text-center text-secondary text-sm">Đang tải tồn kho...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-secondary text-sm">Không có dòng tồn kho nào trong điều kiện lọc.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-secondary text-[11px] uppercase tracking-wider">
                    <th className="px-4 py-3 font-semibold">Sản phẩm</th>
                    <th className="px-4 py-3 font-semibold">Danh mục</th>
                    <th className="px-4 py-3 font-semibold">Kho</th>
                    <th className="px-4 py-3 font-semibold text-right">Tồn</th>
                    <th className="px-4 py-3 font-semibold text-right">Giữ chỗ</th>
                    <th className="px-4 py-3 font-semibold text-right">Khả dụng</th>
                    <th className="px-4 py-3 font-semibold text-right">Giá trị</th>
                    <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {rows.slice(0, MAX_ROWS_SHOWN).map((r) => (
                    <tr key={r.inventoryId ?? `${r.productId}-${r.warehouseId}`} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-on-surface">{r.productName}</div>
                        <div className="font-mono text-[10px] text-slate-500">{r.sku}</div>
                      </td>
                      <td className="px-4 py-2.5 text-secondary">{r.categoryName}</td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{r.warehouseCode}</div>
                        <div className="text-[10px] text-secondary">{r.warehouseName}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold">{fmtNumber(r.currentStock)}</td>
                      <td className="px-4 py-2.5 text-right text-secondary">{fmtNumber(r.reservedStock)}</td>
                      <td className="px-4 py-2.5 text-right">{fmtNumber(r.availableStock)}</td>
                      <td className="px-4 py-2.5 text-right">{fmtCurrency(r.stockValue)}</td>
                      <td className="px-4 py-2.5"><StockStatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > MAX_ROWS_SHOWN && (
              <div className="px-4 py-3 text-[11px] text-secondary border-t border-slate-100 bg-slate-50/50">
                Đang hiển thị {MAX_ROWS_SHOWN}/{fmtNumber(rows.length)} dòng. Số liệu tổng hợp tính trên toàn bộ; file CSV chứa đầy đủ.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
