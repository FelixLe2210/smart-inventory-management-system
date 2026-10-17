import React from 'react';

const fmt = (n) => (n === null || n === undefined ? '---' : Number(n).toLocaleString('vi-VN'));
const fmtTime = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '---' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

/** Các phiếu chuyển kho vừa thực hiện trong phiên làm việc (chỉ lưu trên trình duyệt, tải lại trang sẽ mất). */
export default function RecentTransfers({ transfers = [] }) {
  if (transfers.length === 0) {
    return (
      <div className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm border border-outline-variant flex flex-col items-center justify-center text-center py-12">
        <div className="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center text-secondary mb-3">
          <span className="material-symbols-outlined text-[28px] opacity-60">history</span>
        </div>
        <h3 className="font-headline-sm text-headline-sm text-on-surface">Chưa có phiếu chuyển kho trong phiên</h3>
        <p className="font-body-sm text-body-sm text-secondary max-w-sm mt-1">
          Các phiếu chuyển kho thành công sẽ hiện tại đây để bạn tiện đối soát. Lịch sử đầy đủ nằm ở Nhật ký giao dịch kho.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant overflow-hidden flex flex-col">
      <div className="p-4 bg-surface-container-low/70 border-b border-outline-variant/40 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[20px]">fact_check</span>
        <h3 className="font-body-sm-medium text-body-sm-medium text-on-surface">
          Phiếu chuyển kho vừa thực hiện trong phiên ({transfers.length})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low/40 text-secondary font-label-default text-label-default uppercase tracking-wider">
              <th className="py-2.5 px-4">Thời gian</th>
              <th className="py-2.5 px-4">Sản phẩm</th>
              <th className="py-2.5 px-4">Từ ➔ Đến</th>
              <th className="py-2.5 px-4">Số lượng</th>
              <th className="py-2.5 px-4">Kho nguồn</th>
              <th className="py-2.5 px-4">Kho đích</th>
              <th className="py-2.5 px-4">Đối chiếu</th>
            </tr>
          </thead>
          <tbody className="font-body-sm text-body-sm text-on-surface divide-y divide-outline-variant/30">
            {transfers.map((t) => (
              <tr key={t.id} className="hover:bg-surface-container-low/30 transition-colors">
                <td className="py-2.5 px-4 font-code-mono text-secondary text-[12px]">{fmtTime(t.at)}</td>
                <td className="py-2.5 px-4">
                  <div className="flex flex-col">
                    <span className="font-code-mono font-bold text-primary">{t.productSku}</span>
                    <span className="text-secondary text-[12px]">{t.productName}</span>
                  </div>
                </td>
                <td className="py-2.5 px-4 font-code-mono">{t.sourceCode} ➔ {t.destinationCode}</td>
                <td className="py-2.5 px-4 font-code-mono font-bold text-amber-700">{fmt(t.quantity)} {t.unit}</td>
                <td className="py-2.5 px-4 font-code-mono text-[12px]">{fmt(t.sourceBefore)} ➔ {fmt(t.sourceAfter)}</td>
                <td className="py-2.5 px-4 font-code-mono text-[12px]">{fmt(t.destinationBefore)} ➔ {fmt(t.destinationAfter)}</td>
                <td className="py-2.5 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-body-sm-medium ${t.consistency?.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {t.consistency?.ok ? 'Khớp' : 'Lệch'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
