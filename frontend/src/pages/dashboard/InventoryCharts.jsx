import React from 'react';

/**
 * InventoryCharts - Biểu đồ thống kê tồn kho theo kho & phân bổ danh mục
 * Sprint 6 - Milestone M3 (Sprint6-11: Biểu đồ tồn kho / giao dịch)
 * Thiết kế giao diện SVG Chart hiện đại, nhẹ, mượt mà và trực quan
 */
export default function InventoryCharts({
  warehouseStocks = [],
  categoryDistribution = [],
  transactionBreakdown = {},
}) {
  const maxWhQty = Math.max(...warehouseStocks.map((w) => w.quantity), 10);

  // Bảng màu cho Category donut/progress
  const categoryPalette = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* ── Biểu đồ 1: Tồn kho theo từng kho hàng (Bar Chart) ── */}
      <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-on-surface">Tồn kho theo Chi nhánh</h2>
              <p className="text-xs text-secondary mt-0.5">Số lượng hàng hóa phân bổ ở từng địa điểm</p>
            </div>
            <span className="material-symbols-outlined text-secondary text-[20px]">warehouse</span>
          </div>

          {warehouseStocks.length === 0 ? (
            <div className="py-12 text-center text-xs text-secondary">Chưa có dữ liệu tồn kho</div>
          ) : (
            <div className="space-y-4 pt-2">
              {warehouseStocks.slice(0, 5).map((wh, idx) => {
                const percent = Math.min(Math.round((wh.quantity / maxWhQty) * 100), 100);
                return (
                  <div key={wh.id || idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-on-surface">{wh.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                          {wh.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-on-surface">
                          {new Intl.NumberFormat('vi-VN').format(wh.quantity)} sp
                        </span>
                        <span className="text-secondary text-[11px]">
                          (Khả dụng: {new Intl.NumberFormat('vi-VN').format(wh.available)})
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-secondary">
          <span>Tổng số chi nhánh: {warehouseStocks.length}</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            <span>Tồn kho hiện hữu</span>
          </span>
        </div>
      </div>

      {/* ── Biểu đồ 2: Cơ cấu tồn kho theo danh mục & giao dịch (Category & Activity) ── */}
      <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-on-surface">Phân bổ theo Danh mục</h2>
              <p className="text-xs text-secondary mt-0.5">Tỷ trọng cơ cấu hàng tồn theo từng nhóm sản phẩm</p>
            </div>
            <span className="material-symbols-outlined text-secondary text-[20px]">pie_chart</span>
          </div>

          {categoryDistribution.length === 0 ? (
            <div className="py-12 text-center text-xs text-secondary">Chưa có phân loại danh mục</div>
          ) : (
            <div className="space-y-3.5 pt-2">
              {categoryDistribution.slice(0, 5).map((cat, idx) => {
                const color = categoryPalette[idx % categoryPalette.length];
                return (
                  <div key={idx} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs font-medium text-on-surface truncate">{cat.name}</span>
                    </div>

                    <div className="w-28 bg-slate-100 h-2 rounded-full overflow-hidden shrink-0">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${cat.percentage}%`, backgroundColor: color }}
                      />
                    </div>

                    <div className="text-right shrink-0 w-16">
                      <span className="text-xs font-semibold text-on-surface">{cat.percentage}%</span>
                      <span className="text-[10px] text-secondary block">
                        {new Intl.NumberFormat('vi-VN').format(cat.quantity)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Biến động giao dịch rút gọn */}
        <div className="mt-5 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
          <div className="bg-emerald-50/60 p-2 rounded-lg">
            <span className="text-[10px] text-emerald-800 font-medium block">Nhập kho</span>
            <span className="text-xs font-bold text-emerald-700">
              +{new Intl.NumberFormat('vi-VN').format(transactionBreakdown.RECEIVING?.totalQuantity || 0)}
            </span>
          </div>
          <div className="bg-red-50/60 p-2 rounded-lg">
            <span className="text-[10px] text-red-800 font-medium block">Xuất kho</span>
            <span className="text-xs font-bold text-red-700">
              -{new Intl.NumberFormat('vi-VN').format(transactionBreakdown.ISSUING?.totalQuantity || 0)}
            </span>
          </div>
          <div className="bg-blue-50/60 p-2 rounded-lg">
            <span className="text-[10px] text-blue-800 font-medium block">Chuyển kho</span>
            <span className="text-xs font-bold text-blue-700">
              {new Intl.NumberFormat('vi-VN').format(
                (transactionBreakdown.TRANSFER_IN?.count || 0) + (transactionBreakdown.TRANSFER_OUT?.count || 0)
              )}{' '}
              lượt
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
