import React from 'react';
import TransactionTypeBadge from '../../components/inventory/TransactionTypeBadge';
import DataSourceBadge from '../../components/common/DataSourceBadge';
import { TRANSACTION_REPORT_TYPES, TRANSACTION_CSV_COLUMNS, toCsv } from '../../utils/reports';
import { downloadTextFile, datedFilename } from '../../utils/downloadFile';
import { ReportStat, FilterPanel, Field, ExportButton, controlClass, fmtNumber, fmtDateTime } from './ReportShared';

const MAX_ROWS_SHOWN = 200;

function isoDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

/** Báo cáo giao dịch — Sprint6-14 (Report UI) */
export default function TransactionReportPanel({ reports }) {
  const { txFilters: f, updateTxFilter, resetTxFilters, txReport: report, txSource, warehouses, products, isLoading } = reports;
  const { summary, byType, rows } = report;

  const hasActiveFilter =
    f.from || f.to || f.type !== 'all' || f.warehouseId !== 'all' || f.productId !== 'all';
  const today = isoDate(new Date());

  const handleExport = () => {
    downloadTextFile(datedFilename('bao-cao-giao-dich'), toCsv(TRANSACTION_CSV_COLUMNS, rows));
  };

  return (
    <div className="flex flex-col gap-space-lg">
      <FilterPanel onReset={resetTxFilters} hasActiveFilter={hasActiveFilter}>
        <Field label="Từ ngày">
          <input type="date" value={f.from} max={f.to || undefined} onChange={(e) => updateTxFilter({ from: e.target.value })} className={controlClass} />
        </Field>
        <Field label="Đến ngày">
          <input type="date" value={f.to} min={f.from || undefined} onChange={(e) => updateTxFilter({ to: e.target.value })} className={controlClass} />
        </Field>
        <div className="flex items-center gap-1 pb-0.5">
          {[
            { label: '7 ngày', from: daysAgo(6) },
            { label: '30 ngày', from: daysAgo(29) },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => updateTxFilter({ from: p.from, to: today })}
              className="h-10 px-3 rounded-xl border border-outline-variant text-xs font-medium text-secondary hover:bg-surface-container transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
        <Field label="Loại giao dịch">
          <select value={f.type} onChange={(e) => updateTxFilter({ type: e.target.value })} className={controlClass}>
            <option value="all">Tất cả loại</option>
            {Object.entries(TRANSACTION_REPORT_TYPES).map(([k, cfg]) => (
              <option key={k} value={k}>{cfg.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Kho">
          <select value={f.warehouseId} onChange={(e) => updateTxFilter({ warehouseId: e.target.value })} className={controlClass}>
            <option value="all">Tất cả kho</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.code} - {w.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Sản phẩm">
          <select value={f.productId} onChange={(e) => updateTxFilter({ productId: e.target.value })} className={`${controlClass} max-w-[200px]`}>
            <option value="all">Tất cả sản phẩm</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
            ))}
          </select>
        </Field>
        <div className="ml-auto flex items-center gap-2">
          <DataSourceBadge source={txSource} />
          <ExportButton onClick={handleExport} disabled={rows.length === 0} />
        </div>
      </FilterPanel>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <ReportStat label="Số giao dịch" value={fmtNumber(summary.totalCount)} />
        <ReportStat label="Tổng nhập kho" value={`+${fmtNumber(summary.receivedQuantity)}`} tone="text-emerald-600" />
        <ReportStat label="Tổng xuất kho" value={`-${fmtNumber(summary.issuedQuantity)}`} tone="text-red-600" />
        <ReportStat label="Tổng chuyển kho" value={fmtNumber(summary.transferredQuantity)} hint="Số lượng đã luân chuyển giữa các kho" tone="text-sky-600" />
        <ReportStat
          label="Biến động ròng"
          value={`${summary.netChange > 0 ? '+' : ''}${fmtNumber(summary.netChange)}`}
          hint={`${fmtNumber(summary.adjustmentCount)} lần điều chỉnh`}
          tone={summary.netChange < 0 ? 'text-red-600' : 'text-on-surface'}
        />
      </div>

      {/* Phân bổ theo loại */}
      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-sm p-4">
        <h3 className="text-sm font-semibold text-on-surface mb-3">Theo loại giao dịch</h3>
        <div className="flex flex-wrap gap-3">
          {byType.map((t) => (
            <div key={t.type} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-low">
              <TransactionTypeBadge type={t.type} size="sm" />
              <span className="text-xs text-secondary">
                <b className="text-on-surface">{fmtNumber(t.count)}</b> GD · SL <b className="text-on-surface">{fmtNumber(t.quantity)}</b>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-sm overflow-hidden">
        {isLoading && rows.length === 0 ? (
          <div className="p-10 text-center text-secondary text-sm">Đang tải giao dịch...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-secondary text-sm">Không có giao dịch nào trong điều kiện lọc.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-secondary text-[11px] uppercase tracking-wider">
                    <th className="px-4 py-3 font-semibold">Mã GD</th>
                    <th className="px-4 py-3 font-semibold">Thời gian</th>
                    <th className="px-4 py-3 font-semibold">Loại</th>
                    <th className="px-4 py-3 font-semibold">Sản phẩm</th>
                    <th className="px-4 py-3 font-semibold text-right">Số lượng</th>
                    <th className="px-4 py-3 font-semibold text-right">Tồn trước → sau</th>
                    <th className="px-4 py-3 font-semibold">Chứng từ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {rows.slice(0, MAX_ROWS_SHOWN).map((tx) => (
                    <tr key={tx.id ?? tx.transactionCode} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600">{tx.transactionCode}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{fmtDateTime(tx.createdAt)}</td>
                      <td className="px-4 py-2.5"><TransactionTypeBadge type={tx.transactionType} size="sm" /></td>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-on-surface">{tx.productName}</div>
                        <div className="font-mono text-[10px] text-slate-500">{tx.productSku}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold">{fmtNumber(tx.quantity)}</td>
                      <td className="px-4 py-2.5 text-right text-secondary whitespace-nowrap">
                        {tx.balanceBefore ?? '—'} → <b className="text-on-surface">{tx.balanceAfter ?? '—'}</b>
                      </td>
                      <td className="px-4 py-2.5 text-secondary">{tx.referenceDoc || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > MAX_ROWS_SHOWN && (
              <div className="px-4 py-3 text-[11px] text-secondary border-t border-slate-100 bg-slate-50/50">
                Đang hiển thị {MAX_ROWS_SHOWN}/{fmtNumber(rows.length)} dòng. Số liệu tổng hợp ở trên tính trên toàn bộ {fmtNumber(rows.length)} giao dịch; file CSV chứa đầy đủ.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
