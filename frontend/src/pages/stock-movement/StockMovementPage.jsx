import React from 'react';
import { Link } from 'react-router-dom';
import { useStockMovement } from '../../hooks/useStockMovement';
import StockMovementForm from './StockMovementForm';
import RecentMovements from './RecentMovements';
import ToastNotification from '../../components/common/ToastNotification';

/**
 * StockMovementPage - Trang Vận hành Nhập kho (/inbound) và Xuất kho (/outbound)
 * Sprint 5 - M3 (Sprint5-09, Sprint5-10, Sprint5-12)
 * @param {'RECEIVING' | 'ISSUING'} mode
 */
export default function StockMovementPage({ mode = 'RECEIVING' }) {
  const isReceiving = mode === 'RECEIVING';
  const movement = useStockMovement(mode);

  return (
    <div className="flex flex-col w-full">
      {/* Header + Breadcrumbs */}
      <div className="w-full px-margin py-space-md flex flex-col md:flex-row md:items-center md:justify-between gap-space-md bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col gap-0.5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-space-xs text-secondary font-label-default text-label-default">
            <Link to="/warehouses" className="hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">home</span>
              <span>Trang chủ</span>
            </Link>
            <span className="text-outline-variant">/</span>
            <span className="text-secondary">Vận hành Kho vận</span>
            <span className="text-outline-variant">/</span>
            <span className="text-on-surface font-body-sm-medium">
              {isReceiving ? 'Phiếu Nhập kho (Inbound)' : 'Phiếu Xuất kho (Outbound)'}
            </span>
          </nav>
          <div className="flex items-center gap-space-sm mt-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              {isReceiving ? 'Nhập kho hàng hóa (Inbound)' : 'Xuất kho hàng hóa (Outbound)'}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-body-sm-medium ${
                isReceiving ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {isReceiving ? 'Tiếp nhận hàng' : 'Phân phối / Xuất kho'}
            </span>
          </div>
        </div>

        {/* Action shortcuts */}
        <div className="flex items-center gap-space-sm">
          <Link
            to="/inventory"
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">shelves</span>
            <span>Xem tồn kho hiện tại</span>
          </Link>
          <Link
            to="/transactions"
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            <span>Nhật ký giao dịch</span>
          </Link>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="w-full px-margin py-space-lg flex flex-col gap-space-lg">
        {/* Loading overlay for initial data */}
        {movement.isLoadingData ? (
          <div className="rounded-2xl bg-surface-container-lowest p-12 text-center text-secondary border border-outline-variant">
            <span className="material-symbols-outlined text-[36px] animate-spin text-primary">progress_activity</span>
            <p className="mt-3 font-body-sm text-body-sm text-on-surface">Đang đồng bộ dữ liệu Sản phẩm và Chi nhánh kho...</p>
          </div>
        ) : (
          <>
            <StockMovementForm
              isReceiving={isReceiving}
              products={movement.products}
              warehouses={movement.warehouses}
              form={movement.form}
              errors={movement.errors}
              isSubmitting={movement.isSubmitting}
              currentInventory={movement.currentInventory}
              selectedProduct={movement.selectedProduct}
              selectedWarehouse={movement.selectedWarehouse}
              previewStock={movement.previewStock}
              onUpdateField={movement.updateField}
              onSubmit={movement.handleSubmit}
              onReset={movement.resetForm}
            />

            <RecentMovements movements={movement.recentMovements} isReceiving={isReceiving} />
          </>
        )}
      </div>

      {/* Toast Notification */}
      <ToastNotification visible={movement.toast.visible} text={movement.toast.text} icon={movement.toast.icon} />
    </div>
  );
}
