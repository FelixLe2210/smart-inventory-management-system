import React from 'react';
import { Link } from 'react-router-dom';

/**
 * StockAlertList - Danh sách các sản phẩm hết hàng hoặc chạm ngưỡng an toàn
 * Hỗ trợ liên kết trực tiếp sang màn hình Nhập kho để xử lý nhanh
 */
export default function StockAlertList({ alerts = [] }) {
  if (alerts.length === 0) {
    return (
      <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col items-center justify-center text-center py-10">
        <span className="material-symbols-outlined text-emerald-500 text-[36px] mb-2">
          check_circle
        </span>
        <h3 className="text-sm font-semibold text-on-surface">Kho hàng ổn định</h3>
        <p className="text-xs text-secondary mt-1 max-w-[260px]">
          Hiện tại không có sản phẩm nào chạm ngưỡng hết hàng hoặc cảnh báo tồn thấp.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col justify-between">
      <div className="p-5 pb-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-500 text-[20px]">notification_important</span>
          <h2 className="text-base font-semibold text-on-surface">Cảnh báo Tồn kho</h2>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-700 border border-red-200">
          {alerts.length} cảnh báo
        </span>
      </div>

      <div className="divide-y divide-slate-100 p-2">
        {alerts.map((item, idx) => (
          <div key={item.product?.id || idx} className="p-3 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-on-surface truncate">
                  {item.product?.name}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                  {item.product?.sku}
                </span>
              </div>
              <div className="text-[11px] text-secondary mt-1 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 font-medium ${
                    item.type === 'OUT_OF_STOCK' ? 'text-red-600' : 'text-amber-600'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {item.message}
                </span>
                <span>• Tối thiểu: {item.minStock}</span>
              </div>
            </div>

            <Link
              to="/inbound"
              className="shrink-0 px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-medium rounded-md transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">add_shopping_cart</span>
              <span>Nhập hàng</span>
            </Link>
          </div>
        ))}
      </div>

      <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-center">
        <Link to="/inventory" className="text-xs text-primary hover:underline font-medium">
          Xem toàn bộ danh sách tồn kho →
        </Link>
      </div>
    </div>
  );
}
