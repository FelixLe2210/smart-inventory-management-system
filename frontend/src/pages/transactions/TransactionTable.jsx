import React from 'react';
import TransactionTypeBadge from '../../components/inventory/TransactionTypeBadge';

function fmtDateTime(iso) {
  if (!iso) return '---';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '---'
    : d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

export default function TransactionTable({
  transactions = [],
  isLoading,
  isBackendSupported,
  loadError,
  onRetry,
}) {
  return (
    <div className="rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant overflow-hidden flex flex-col">
      {/* Banner thông báo trạng thái backend */}
      {!isBackendSupported && (
        <div className="p-4 bg-amber-50 border-b border-amber-200 text-amber-900 flex items-start gap-3">
          <span className="material-symbols-outlined text-[22px] text-amber-600 mt-0.5">info</span>
          <div className="flex-1">
            <h4 className="font-body-sm-medium text-body-sm-medium">Tính năng đang đồng bộ từ Backend Sprint 5</h4>
            <p className="text-body-sm text-amber-800 mt-0.5">
            API lịch sử giao dịch chưa khả dụng. Hãy kiểm tra phiên bản backend hoặc thử tải lại.
            </p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low/70 text-secondary font-label-default text-label-default uppercase tracking-wider border-b border-outline-variant/40">
              <th className="py-3 px-4 min-w-[140px]">Mã GD</th>
              <th className="py-3 px-4 min-w-[150px]">Loại giao dịch</th>
              <th className="py-3 px-4 min-w-[180px]">Sản phẩm</th>
              <th className="py-3 px-4 min-w-[160px]">Kho nguồn / Đích</th>
              <th className="py-3 px-4 min-w-[110px]">Số lượng</th>
              <th className="py-3 px-4 min-w-[140px]">Tồn trước ➔ sau</th>
              <th className="py-3 px-4 min-w-[130px]">Chứng từ</th>
              <th className="py-3 px-4 min-w-[160px]">Lý do</th>
              <th className="py-3 px-4 min-w-[130px]">Thời gian</th>
            </tr>
          </thead>
          <tbody className="font-body-sm text-body-sm text-on-surface divide-y divide-outline-variant/30">
            {loadError && transactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-secondary">
                  <span className="material-symbols-outlined text-[32px] text-error">cloud_off</span>
                  <p className="font-body-sm-medium text-on-surface mt-2">{loadError}</p>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-3 px-3.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm-medium"
                  >
                    Thử lại
                  </button>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-secondary">
                  <div className="w-16 h-16 rounded-2xl bg-surface-container-low text-secondary mx-auto flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[32px] opacity-60">
                      {isLoading ? 'hourglass_top' : 'receipt_long'}
                    </span>
                  </div>
                  <p className="font-body-sm-medium text-on-surface">
                    {isLoading
                      ? 'Đang tải lịch sử giao dịch kho...'
                      : 'Không có giao dịch nào phù hợp với bộ lọc'}
                  </p>
                  {!isLoading && (
                    <p className="text-secondary text-body-sm mt-1 max-w-sm mx-auto">
                      Hãy tạo các phiếu Nhập kho (Inbound) hoặc Xuất kho (Outbound) để hệ thống tự động ghi nhận biến động tồn.
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id || t.transactionCode} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-code-mono font-bold text-primary text-[13px]">{t.transactionCode}</span>
                  </td>
                  <td className="py-3 px-4">
                    <TransactionTypeBadge type={t.transactionType} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-code-mono font-bold text-on-surface">{t.productSku}</span>
                      <span className="text-[12px] text-secondary">{t.productName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 font-code-mono text-[12px]">
                      <span className="text-secondary">{t.sourceWarehouseCode || '---'}</span>
                      <span className="text-outline">➔</span>
                      <span className="font-medium text-on-surface">{t.destinationWarehouseCode || '---'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-code-mono font-bold text-[14px] ${
                        t.transactionType === 'RECEIVING' || t.transactionType === 'TRANSFER_IN'
                          ? 'text-emerald-600'
                          : t.transactionType === 'ISSUING' || t.transactionType === 'TRANSFER_OUT'
                          ? 'text-red-600'
                          : 'text-purple-600'
                      }`}
                    >
                      {t.transactionType === 'RECEIVING' || t.transactionType === 'TRANSFER_IN'
                        ? '+'
                        : t.transactionType === 'ISSUING' || t.transactionType === 'TRANSFER_OUT'
                        ? '-'
                        : ''}
                      {Number(t.quantity || 0).toLocaleString('vi-VN')}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-code-mono text-[13px]">
                    <span className="text-secondary">{t.balanceBefore ?? '---'}</span>
                    <span className="text-outline mx-1">➔</span>
                    <span className="font-bold text-on-surface">{t.balanceAfter ?? '---'}</span>
                  </td>
                  <td className="py-3 px-4">
                    {t.referenceDoc ? (
                      <span className="px-2 py-0.5 rounded bg-surface-container font-code-mono text-[12px] font-medium text-on-surface">
                        {t.referenceDoc}
                      </span>
                    ) : (
                      <span className="text-secondary text-[12px]">---</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-secondary text-[12px] max-w-[220px] truncate" title={t.reason}>
                    {t.reason || '---'}
                  </td>
                  <td className="py-3 px-4 font-code-mono text-secondary text-[12px]">
                    {fmtDateTime(t.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-space-lg py-3 bg-surface-container-low/50 border-t border-outline-variant/30 flex items-center justify-between text-secondary font-label-default text-label-default">
        <span>
          Hiển thị <strong>{transactions.length}</strong> bản ghi giao dịch
        </span>
        <span className="text-outline">Kiểm soát biến động kho theo thời gian thực (Audit Trail)</span>
      </div>
    </div>
  );
}
