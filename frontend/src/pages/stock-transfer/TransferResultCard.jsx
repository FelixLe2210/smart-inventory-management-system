import React from 'react';
import { Link } from 'react-router-dom';

const fmt = (n) => (n === null || n === undefined ? '---' : Number(n).toLocaleString('vi-VN'));

/** Kết quả giao dịch vừa thực hiện, kèm đối chiếu với tồn thật đọc lại từ server (Sprint5-14). */
export default function TransferResultCard({ result }) {
  if (!result) return null;
  const ok = result.consistency?.ok;
  return (
    <div
      className={`rounded-2xl p-space-lg shadow-sm border flex flex-col gap-4 ${
        ok ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50 border-amber-300'
      }`}
      role="status"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined text-[24px] ${ok ? 'text-emerald-600' : 'text-amber-600'}`}>
            {ok ? 'check_circle' : 'warning'}
          </span>
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              {ok ? 'Chuyển kho thành công' : 'Đã chuyển kho, nhưng số liệu đối chiếu chưa khớp'}
            </h3>
            <p className="font-body-sm text-body-sm text-secondary">
              {result.productSku} - {result.productName}
            </p>
          </div>
        </div>
        <Link
          to="/transactions"
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">receipt_long</span>
          <span>Xem nhật ký</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/60">
          <span className="font-label-sm text-label-sm text-secondary block">Kho nguồn: {result.sourceCode}</span>
          <span className="font-display text-[20px] font-bold text-red-700">
            {fmt(result.sourceBefore)} ➔ {fmt(result.sourceAfter)} {result.unit}
          </span>
        </div>
        <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/60">
          <span className="font-label-sm text-label-sm text-secondary block">
            Kho đích: {result.destinationCode}
            {result.destinationWasNew ? ' (dòng tồn mới)' : ''}
          </span>
          <span className="font-display text-[20px] font-bold text-emerald-700">
            {fmt(result.destinationBefore)} ➔ {fmt(result.destinationAfter)} {result.unit}
          </span>
        </div>
      </div>

      <dl className="grid grid-cols-1 md:grid-cols-3 gap-2 font-body-sm text-body-sm">
        <div><dt className="text-secondary text-label-sm">Số lượng chuyển</dt><dd className="font-code-mono font-bold">{fmt(result.quantity)} {result.unit}</dd></div>
        <div><dt className="text-secondary text-label-sm">Mã giao dịch</dt><dd className="font-code-mono break-all">{result.transactionCode || '---'}</dd></div>
        <div><dt className="text-secondary text-label-sm">Chứng từ</dt><dd className="font-code-mono">{result.referenceDoc || '---'}</dd></div>
      </dl>

      {!ok && (
        <ul className="list-disc pl-5 text-label-sm text-amber-800">
          {result.consistency.problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
    </div>
  );
}
