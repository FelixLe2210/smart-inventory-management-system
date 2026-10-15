import React from 'react';
import TransactionTypeBadge from '../../components/inventory/TransactionTypeBadge';

function fmtTime(iso) {
  if (!iso) return '---';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '---' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function RecentMovements({ movements = [], isReceiving }) {
  if (movements.length === 0) {
    return (
      <div className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm border border-outline-variant flex flex-col items-center justify-center text-center py-12">
        <div className="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center text-secondary mb-3">
          <span className="material-symbols-outlined text-[28px] opacity-60">history</span>
        </div>
        <h3 className="font-headline-sm text-headline-sm text-on-surface">Chưa có giao dịch trong phiên</h3>
        <p className="font-body-sm text-body-sm text-secondary max-w-sm mt-1">
          Các phiếu {isReceiving ? 'nhập kho' : 'xuất kho'} được tạo thành công sẽ hiển thị tức thì tại đây để bạn tiện đối soát.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant overflow-hidden flex flex-col">
      <div className="p-4 bg-surface-container-low/70 border-b border-outline-variant/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">fact_check</span>
          <h3 className="font-body-sm-medium text-body-sm-medium text-on-surface">
            Phiếu {isReceiving ? 'nhập' : 'xuất'} vừa thực hiện trong phiên ({movements.length})
          </h3>
        </div>
        <span className="text-label-sm text-secondary">Cập nhật tự động</span>
      </div>

      <div className="divide-y divide-outline-variant/30 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low/40 text-secondary font-label-default text-label-default uppercase tracking-wider">
              <th className="py-2.5 px-4">Thời gian</th>
              <th className="py-2.5 px-4">Sản phẩm</th>
              <th className="py-2.5 px-4">Kho</th>
              <th className="py-2.5 px-4">Số lượng</th>
              <th className="py-2.5 px-4">Số dư trước ➔ sau</th>
              <th className="py-2.5 px-4">Chứng từ</th>
              <th className="py-2.5 px-4">Lý do</th>
            </tr>
          </thead>
          <tbody className="font-body-sm text-body-sm text-on-surface">
            {movements.map((m) => (
              <tr key={m.id} className="hover:bg-surface-container-low/30 transition-colors">
                <td className="py-2.5 px-4 font-code-mono text-secondary text-[12px]">{fmtTime(m.timestamp)}</td>
                <td className="py-2.5 px-4">
                  <div className="flex flex-col">
                    <span className="font-code-mono font-bold text-primary">{m.productSku}</span>
                    <span className="text-secondary text-[12px]">{m.productName}</span>
                  </div>
                </td>
                <td className="py-2.5 px-4">
                  <span className="font-code-mono text-on-surface font-medium">{m.warehouseCode}</span>
                </td>
                <td className="py-2.5 px-4">
                  <span
                    className={`font-code-mono font-bold ${
                      m.type === 'RECEIVING' ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {m.type === 'RECEIVING' ? '+' : '-'}
                    {m.quantity.toLocaleString('vi-VN')}
                  </span>
                </td>
                <td className="py-2.5 px-4 font-code-mono text-[13px]">
                  <span className="text-secondary">{m.balanceBefore}</span>
                  <span className="text-outline mx-1.5">➔</span>
                  <span className="font-bold text-on-surface">{m.balanceAfter}</span>
                </td>
                <td className="py-2.5 px-4 font-code-mono text-secondary text-[12px]">
                  {m.referenceDoc !== '---' ? (
                    <span className="px-2 py-0.5 rounded bg-surface-container font-medium text-on-surface">
                      {m.referenceDoc}
                    </span>
                  ) : (
                    '---'
                  )}
                </td>
                <td className="py-2.5 px-4 text-secondary text-[12px] max-w-[200px] truncate" title={m.reason}>
                  {m.reason}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
