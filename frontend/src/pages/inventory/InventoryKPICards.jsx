import { STOCK_STATUS } from '../../components/inventory/StockStatusBadge';

const STYLE = {
  IN_STOCK: { wrap: 'bg-emerald-50', color: 'text-emerald-600', foot: ['Min < Tồn ≤ Max', 'An toàn'] },
  LOW_STOCK: { wrap: 'bg-amber-50', color: 'text-amber-600', foot: ['0 < Tồn ≤ Min', 'Cần nhập thêm'] },
  OUT_OF_STOCK: { wrap: 'bg-red-50', color: 'text-red-600', foot: ['Tồn = 0', 'Cần xử lý ngay'] },
  OVER_STOCK: { wrap: 'bg-sky-50', color: 'text-sky-600', foot: ['Tồn > Max', 'Cân nhắc điều chuyển'] },
};

/**
 * Thẻ KPI tồn kho. Bấm vào thẻ để lọc nhanh theo trạng thái (Sprint4-13/14).
 */
export default function InventoryKPICards({ summary, activeStatus, onSelectStatus }) {
  const countOf = {
    IN_STOCK: summary.inStock,
    LOW_STOCK: summary.lowStock,
    OUT_OF_STOCK: summary.outOfStock,
    OVER_STOCK: summary.overStock,
  };

  const cards = [
    {
      key: 'all',
      label: 'Tổng dòng tồn kho',
      value: summary.totalItems,
      icon: 'shelves',
      wrap: 'bg-primary-container/10',
      color: 'text-primary',
      foot: ['Tổng số lượng', `${Number(summary.totalUnits || 0).toLocaleString('vi-VN')} đơn vị`],
    },
    ...['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'OVER_STOCK'].map((k) => ({
      key: k,
      label: `${STOCK_STATUS[k].label} (${STOCK_STATUS[k].english})`,
      value: countOf[k],
      icon: STOCK_STATUS[k].icon,
      wrap: STYLE[k].wrap,
      color: STYLE[k].color,
      foot: STYLE[k].foot,
    })),
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-space-md">
      {cards.map((c) => {
        const selected = c.key === 'all' ? activeStatus === 'all' : c.key === activeStatus;
        return (
          <button
            key={c.key}
            type="button"
            id={`kpi-inventory-${c.key.toLowerCase()}`}
            onClick={() => onSelectStatus(c.key === 'all' ? 'all' : c.key)}
            aria-pressed={selected}
            className={`text-left p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all border ${
              selected && c.key !== 'all' ? 'border-primary ring-1 ring-primary/30' : 'border-transparent'
            }`}
          >
            <div className={`absolute -right-3 -top-3 w-16 h-16 rounded-full ${c.wrap} group-hover:scale-125 transition-transform flex items-center justify-center`}>
              <span className={`material-symbols-outlined ${c.color} text-[28px]`}>{c.icon}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-default text-label-default text-secondary uppercase tracking-wider pr-10">{c.label}</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-display text-on-surface font-bold">{c.value}</span>
                <span className="font-label-default text-label-default text-secondary">bản ghi</span>
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between gap-2 text-label-sm font-label-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg">
              <span className="text-secondary">{c.foot[0]}</span>
              <span className={`font-body-sm-medium ${c.color}`}>{c.foot[1]}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
