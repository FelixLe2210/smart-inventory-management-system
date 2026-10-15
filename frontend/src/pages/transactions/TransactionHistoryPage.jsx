import React from 'react';
import { Link } from 'react-router-dom';
import { useTransactionHistory } from '../../hooks/useTransactionHistory';
import TransactionFilterBar from './TransactionFilterBar';
import TransactionTable from './TransactionTable';

/**
 * TransactionHistoryPage - Màn hình Lịch sử Giao dịch Kho (/transactions)
 * Sprint 5 - M3 (Sprint5-11, Sprint5-12)
 */
export default function TransactionHistoryPage() {
  const history = useTransactionHistory();

  return (
    <div className="flex flex-col w-full">
      {/* Header & Breadcrumbs */}
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
            <span className="text-on-surface font-body-sm-medium">Lịch sử giao dịch kho</span>
          </nav>
          <div className="flex items-center gap-space-sm mt-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              Lịch sử Giao dịch & Biến động Kho
            </h1>
            <span className="px-2.5 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container text-primary font-body-sm-medium">
              {history.transactions.length} giao dịch
            </span>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center gap-space-sm flex-wrap">
          <button
            type="button"
            onClick={history.fetchAll}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-surface-container-high transition-colors"
          >
            <span className={`material-symbols-outlined text-[18px] ${history.isLoading ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>{history.isLoading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
          <Link
            to="/inbound"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">move_to_inbox</span>
            <span>Nhập kho</span>
          </Link>
          <Link
            to="/outbound"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-on-primary font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-primary-container transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">outbox</span>
            <span>Xuất kho</span>
          </Link>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="w-full px-margin py-space-lg flex flex-col gap-space-lg">
        <TransactionFilterBar
          type={history.filterType}
          onType={history.setFilterType}
          warehouses={history.warehouses}
          warehouseId={history.filterWarehouse}
          onWarehouse={history.setFilterWarehouse}
          products={history.products}
          productId={history.filterProduct}
          onProduct={history.setFilterProduct}
          search={history.search}
          onSearch={history.setSearch}
          hasActiveFilter={history.hasActiveFilter}
          onReset={history.resetFilters}
        />

        <TransactionTable
          transactions={history.transactions}
          isLoading={history.isLoading}
          isBackendSupported={history.isBackendSupported}
          loadError={history.loadError}
          onRetry={history.fetchAll}
        />
      </div>
    </div>
  );
}
