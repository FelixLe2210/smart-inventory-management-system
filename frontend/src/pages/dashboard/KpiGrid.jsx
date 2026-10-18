import React from 'react';
import KpiCard from './KpiCard';

/**
 * KpiGrid - Lưới 4-6 chỉ số đo lường hiệu suất chính
 * Sprint 6 - Milestone M3 (Sprint6-10: Products, stock, low stock, out of stock)
 */
export default function KpiGrid({ kpis }) {
  if (!kpis) return null;

  const formatNumber = (num) => new Intl.NumberFormat('vi-VN').format(num || 0);
  const formatCurrency = (num) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Tổng sản phẩm SKU */}
      <KpiCard
        title="Tổng danh mục SKU"
        value={formatNumber(kpis.totalProducts)}
        subValue="Sản phẩm đang quản lý"
        icon="inventory_2"
        iconBgColor="bg-blue-50 text-blue-600"
        badgeText="Đang hoạt động"
        badgeType="default"
      />

      {/* 2. Tổng số lượng tồn kho */}
      <KpiCard
        title="Tổng lượng tồn kho"
        value={formatNumber(kpis.totalStockQuantity)}
        subValue={`Khả dụng: ${formatNumber(kpis.totalAvailableQuantity)} | Giữ chỗ: ${formatNumber(
          kpis.totalReservedQuantity
        )}`}
        icon="all_inbox"
        iconBgColor="bg-indigo-50 text-indigo-600"
        badgeText={`${kpis.activeWarehouses} kho online`}
        badgeType="success"
      />

      {/* 3. Cảnh báo sắp hết hàng (Low Stock) */}
      <KpiCard
        title="Hàng sắp hết (Low Stock)"
        value={formatNumber(kpis.lowStockCount)}
        subValue="Dưới ngưỡng an toàn tối thiểu"
        icon="warning"
        iconBgColor="bg-amber-50 text-amber-600"
        badgeText={kpis.lowStockCount > 0 ? 'Cần nhập thêm' : 'Ổn định'}
        badgeType={kpis.lowStockCount > 0 ? 'warning' : 'success'}
      />

      {/* 4. Cảnh báo hết hàng (Out of Stock) */}
      <KpiCard
        title="Mặt hàng hết kho"
        value={formatNumber(kpis.outOfStockCount)}
        subValue={`Giá trị tồn: ${formatCurrency(kpis.totalInventoryValue)}`}
        icon="production_quantity_limits"
        iconBgColor="bg-red-50 text-red-600"
        badgeText={kpis.outOfStockCount > 0 ? 'Khẩn cấp' : 'Tốt'}
        badgeType={kpis.outOfStockCount > 0 ? 'danger' : 'success'}
      />
    </div>
  );
}
