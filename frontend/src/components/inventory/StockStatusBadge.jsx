/**
 * Cấu hình hiển thị 3 trạng thái tồn kho (Sprint4-13).
 * Giá trị khóa trùng với Inventory.getStockStatus() ở backend
 * (In Stock / Low Stock / Out of Stock theo yêu cầu, thêm Over Stock khi tồn > Max).
 */
export const STOCK_STATUS = {
  IN_STOCK: {
    label: 'Còn hàng',
    english: 'In Stock',
    icon: 'check_circle',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-600',
    bar: 'bg-emerald-500',
  },
  LOW_STOCK: {
    label: 'Sắp hết',
    english: 'Low Stock',
    icon: 'warning',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
  },
  OVER_STOCK: {
    label: 'Vượt định mức',
    english: 'Over Stock',
    icon: 'inventory',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-600',
    bar: 'bg-sky-500',
  },
  OUT_OF_STOCK: {
    label: 'Hết hàng',
    english: 'Out of Stock',
    icon: 'error',
    badge: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-600',
    bar: 'bg-red-500',
  },
};

export const STOCK_STATUS_KEYS = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'OVER_STOCK'];

/** Chip hiển thị trạng thái tồn: In Stock / Low Stock / Out of Stock. */
export default function StockStatusBadge({ status, showEnglish = false }) {
  const cfg = STOCK_STATUS[status] || STOCK_STATUS.IN_STOCK;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-bold border whitespace-nowrap ${cfg.badge}`}
      title={cfg.english}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
      {showEnglish && <span className="font-normal opacity-70">· {cfg.english}</span>}
    </span>
  );
}
