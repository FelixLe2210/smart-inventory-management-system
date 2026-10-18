import React from 'react';
import { Link } from 'react-router-dom';
import TransactionTypeBadge from '../../components/inventory/TransactionTypeBadge';

/**
 * RecentTransactions - Bảng giao dịch kho phát sinh gần đây
 * Sprint 6 - Milestone M3 (Sprint6-12: Recent Transactions UI)
 */
export default function RecentTransactions({ transactions = [], isLoading = false }) {
  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const getQuantityDisplay = (tx) => {
    const qty = tx.quantity || 0;
    const formatted = new Intl.NumberFormat('vi-VN').format(qty);

    switch (tx.transactionType) {
      case 'RECEIVING':
      case 'TRANSFER_IN':
        return <span className="font-semibold text-emerald-600">+{formatted}</span>;
      case 'ISSUING':
      case 'TRANSFER_OUT':
        return <span className="font-semibold text-red-600">-{formatted}</span>;
      default:
        return <span className="font-semibold text-slate-700">{formatted}</span>;
    }
  };

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col justify-between">
      <div className="p-5 pb-3 flex items-center justify-between border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-on-surface">Giao dịch Kho gần đây</h2>
          <p className="text-xs text-secondary mt-0.5">Các biến động xuất, nhập, chuyển kho mới nhất</p>
        </div>
        <Link
          to="/transactions"
          className="text-xs font-medium text-primary hover:text-primary-container flex items-center gap-1 transition-colors"
        >
          <span>Xem tất cả</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-secondary uppercase tracking-wider">
              <th className="py-2.5 px-4">Mã GD / Thời gian</th>
              <th className="py-2.5 px-4">Loại GD</th>
              <th className="py-2.5 px-4">Sản phẩm</th>
              <th className="py-2.5 px-4">Kho liên quan</th>
              <th className="py-2.5 px-4 text-right">Số lượng</th>
              <th className="py-2.5 px-4 text-right">Tồn sau</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {isLoading ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-secondary">
                  <div className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                    <span>Đang tải giao dịch...</span>
                  </div>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-secondary">
                  Chưa có giao dịch biến động nào được ghi nhận.
                </td>
              </tr>
            ) : (
              transactions.map((tx, idx) => (
                <tr key={tx.id || idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-mono text-[11px] font-medium text-slate-800">
                      {tx.transactionCode || `TX-${tx.id || idx}`}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{formatDate(tx.createdAt)}</div>
                  </td>

                  <td className="py-3 px-4">
                    <TransactionTypeBadge type={tx.transactionType} />
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-medium text-on-surface truncate max-w-[200px]">
                      {tx.productName || 'Sản phẩm'}
                    </div>
                    <div className="text-[11px] font-mono text-secondary">{tx.productSku}</div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="text-secondary">{tx.warehouseName || '—'}</span>
                  </td>

                  <td className="py-3 px-4 text-right font-medium">
                    {getQuantityDisplay(tx)}
                  </td>

                  <td className="py-3 px-4 text-right text-slate-600 font-mono">
                    {tx.balanceAfter !== undefined && tx.balanceAfter !== null
                      ? new Intl.NumberFormat('vi-VN').format(tx.balanceAfter)
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[11px] text-secondary px-4">
        <span>Hiển thị {transactions.length} giao dịch gần nhất</span>
        <div className="flex items-center gap-2">
          <Link
            to="/inbound"
            className="text-primary hover:underline flex items-center gap-0.5"
          >
            <span>+ Tạo phiếu nhập</span>
          </Link>
          <span>•</span>
          <Link
            to="/outbound"
            className="text-primary hover:underline flex items-center gap-0.5"
          >
            <span>- Tạo phiếu xuất</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
