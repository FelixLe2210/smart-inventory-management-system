/**
 * WarehouseKPICards – Dải 4 thẻ thống kê tổng quan đầu trang Warehouse.
 * Props: warehouses (array) – danh sách toàn bộ kho để tính KPI.
 */
export default function WarehouseKPICards({ warehouses }) {
  const totalCapacity = warehouses.reduce((s, w) => s + w.capacity, 0);
  const totalUsed = warehouses.reduce((s, w) => s + w.used, 0);
  const fillRate = totalCapacity ? ((totalUsed / totalCapacity) * 100).toFixed(1) : 0;
  const activeCount = warehouses.filter((w) => w.status === "active").length;
  const maintenanceCount = warehouses.filter((w) => w.status === "maintenance").length;
  const totalArea = warehouses
    .reduce((s, w) => s + parseFloat(w.area?.replace(/[^0-9.]/g, "") || 0), 0)
    .toLocaleString("vi-VN");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
      {/* Card 1 – Tổng số kho */}
      <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-primary-container/10 group-hover:scale-125 transition-transform flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-[28px]">domain</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-label-default text-label-default text-secondary uppercase tracking-wider">
            Tổng số kho vận hành
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-display text-on-surface font-bold">{warehouses.length}</span>
            <span className="font-label-default text-label-default text-secondary">cơ sở</span>
          </div>
        </div>
        <div className="mt-4 pt-3 flex items-center justify-between text-label-sm font-label-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg">
          <div className="flex items-center gap-1 text-on-surface">
            <span className="w-2 h-2 rounded-full bg-primary-container" />
            <span>Active: <strong>{activeCount} kho</strong></span>
          </div>
          <div className="flex items-center gap-1 text-on-surface-variant">
            <span className="w-2 h-2 rounded-full bg-secondary" />
            <span>Bảo trì: <strong>{maintenanceCount} kho</strong></span>
          </div>
        </div>
      </div>

      {/* Card 2 – Tổng diện tích */}
      <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-tertiary-container/10 group-hover:scale-125 transition-transform flex items-center justify-center">
          <span className="material-symbols-outlined text-tertiary text-[28px]">square_foot</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-label-default text-label-default text-secondary uppercase tracking-wider">
            Tổng diện tích lưu trữ
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-display text-on-surface font-bold">{totalArea}</span>
            <span className="font-label-default text-label-default text-secondary">m²</span>
          </div>
        </div>
        <div className="mt-4 pt-3 flex items-center justify-between text-label-sm font-label-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg">
          <span className="text-secondary">Tỷ lệ lấp đầy TB</span>
          <span className="font-body-sm-medium text-body-sm-medium text-primary">{fillRate}% sàn khả dụng</span>
        </div>
      </div>

      {/* Card 3 – Tổng sức chứa */}
      <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-secondary-container group-hover:scale-125 transition-transform flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-[28px]">inventory</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-label-default text-label-default text-secondary uppercase tracking-wider">
            Tổng sức chứa Pallet
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-display text-on-surface font-bold">
              {totalCapacity.toLocaleString("vi-VN")}
            </span>
            <span className="font-label-default text-label-default text-secondary">Pallets</span>
          </div>
        </div>
        <div className="mt-4 pt-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between font-label-sm text-label-sm">
            <span className="text-secondary">Đã nạp: {totalUsed.toLocaleString("vi-VN")} pallet</span>
            <span className="font-body-sm-medium text-on-surface">{fillRate}%</span>
          </div>
          <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-primary-container rounded-full" style={{ width: `${fillRate}%` }} />
          </div>
        </div>
      </div>

      {/* Card 4 – Hiệu suất */}
      <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-surface-container-high group-hover:scale-125 transition-transform flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-[28px]">speed</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-label-default text-label-default text-secondary uppercase tracking-wider">
            Hiệu suất vận hành kho
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-display text-on-surface font-bold">96.2%</span>
            <span className="text-label-sm font-label-sm text-primary flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[14px]">trending_up</span> +1.8%
            </span>
          </div>
        </div>
        <div className="mt-4 pt-3 flex items-center justify-between text-label-sm font-label-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg">
          <span className="text-secondary">Đơn hoàn tất đúng SLA</span>
          <span className="font-body-sm-medium text-body-sm-medium text-on-surface">98.1% tuần này</span>
        </div>
      </div>
    </div>
  );
}
