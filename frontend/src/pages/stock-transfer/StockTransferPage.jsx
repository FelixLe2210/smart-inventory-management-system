import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStockTransfer } from '../../hooks/useStockTransfer';
import StockTransferForm from './StockTransferForm';
import TransferResultCard from './TransferResultCard';
import RecentTransfers from './RecentTransfers';
import ToastNotification from '../../components/common/ToastNotification';

/**
 * StockTransferPage - Trang Chuyển kho giữa các chi nhánh (/transfer)
 * Sprint 5 - M4 (Sprint5-13 Stock Transfer UI/Flow)
 * Có thể mở sẵn từ trang Tồn kho: /transfer?productId=..&sourceWarehouseId=..
 */
export default function StockTransferPage() {
  const [searchParams] = useSearchParams();
  const transfer = useStockTransfer({
    productId: searchParams.get('productId') || '',
    sourceWarehouseId: searchParams.get('sourceWarehouseId') || '',
  });

  return (
    <div className="flex flex-col w-full">
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
            <span className="text-on-surface font-body-sm-medium">Chuyển kho (Transfer)</span>
          </nav>
          <div className="flex items-center gap-space-sm mt-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Chuyển kho giữa các chi nhánh</h1>
            <span className="px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-body-sm-medium bg-amber-50 text-amber-700">
              Điều chuyển nội bộ
            </span>
          </div>
        </div>
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

      <div className="w-full px-margin py-space-lg flex flex-col gap-space-lg">
        {transfer.isLoadingData ? (
          <div className="rounded-2xl bg-surface-container-lowest p-12 text-center text-secondary border border-outline-variant">
            <span className="material-symbols-outlined text-[36px] animate-spin text-primary">progress_activity</span>
            <p className="mt-3 font-body-sm text-body-sm text-on-surface">Đang đồng bộ dữ liệu Sản phẩm, Chi nhánh kho và Tồn kho...</p>
          </div>
        ) : transfer.loadError ? (
          <div className="rounded-2xl bg-error-container text-on-error-container p-space-lg flex items-center justify-between gap-3" role="alert">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">error</span>
              <span className="font-body-sm text-body-sm">{transfer.loadError}</span>
            </div>
            <button
              type="button"
              onClick={() => transfer.loadData()}
              className="px-3 py-2 rounded-lg bg-surface text-on-surface font-body-sm-medium text-body-sm-medium"
            >
              Tải lại
            </button>
          </div>
        ) : (
          <>
            <StockTransferForm
              products={transfer.transferableProducts}
              sourceOptions={transfer.sourceOptions}
              destinationOptions={transfer.destinationOptions}
              form={transfer.form}
              errors={transfer.errors}
              submitError={transfer.submitError}
              isSubmitting={transfer.isSubmitting}
              selectedProduct={transfer.selectedProduct}
              sourceInventory={transfer.sourceInventory}
              destinationInventory={transfer.destinationInventory}
              destinationWarehouse={transfer.destinationWarehouse}
              preview={transfer.preview}
              onUpdateField={transfer.updateField}
              onFillAll={transfer.fillAllAvailable}
              onSubmit={transfer.handleSubmit}
              onReset={transfer.resetForm}
            />
            <TransferResultCard result={transfer.lastResult} />
            <RecentTransfers transfers={transfer.recentTransfers} />
          </>
        )}
      </div>

      <ToastNotification visible={transfer.toast.visible} text={transfer.toast.text} icon={transfer.toast.icon} />
    </div>
  );
}
