import { Link } from 'react-router-dom';
import { useInventory } from '../../hooks/useInventory';
import ToastNotification from '../../components/common/ToastNotification';
import InventoryKPICards from './InventoryKPICards';
import InventoryFilterBar from './InventoryFilterBar';
import InventoryTable from './InventoryTable';
import InventoryModal from './InventoryModal';

/**
 * InventoryPage – Tồn kho theo Sản phẩm x Kho (/inventory).
 *   Sprint4-13: hiển thị In Stock / Low Stock / Out of Stock (+ Over Stock)
 *   Sprint4-14: lọc theo kho / sản phẩm / trạng thái
 *   Sprint4-15: kết nối Master Data (Product, Warehouse) với Inventory
 */
export default function InventoryPage() {
  const inv = useInventory();

  return (
    <div className="flex flex-col w-full">
      {/* Breadcrumb + tiêu đề + nút */}
      <div className="w-full px-margin py-space-md flex flex-col md:flex-row md:items-center md:justify-between gap-space-md bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col gap-0.5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-space-xs text-secondary font-label-default text-label-default">
            <Link to="/warehouses" className="hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">home</span>
              <span>Trang chủ</span>
            </Link>
            <span className="text-outline-variant">/</span>
            <span className="text-secondary">Vận hành kho</span>
            <span className="text-outline-variant">/</span>
            <span className="text-on-surface font-body-sm-medium">Kiểm kê & Tồn kho</span>
          </nav>
          <div className="flex items-center gap-space-sm mt-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Kiểm kê & Tồn kho</h1>
            <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container text-primary font-body-sm-medium">
              {inv.summary.totalItems} dòng tồn
            </span>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-space-sm">
          <button
            id="btn-refresh-inventory"
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-surface-container-high transition-colors"
            onClick={async () => {
              await inv.fetchInventory();
              inv.showToast('Đã làm mới dữ liệu tồn kho', 'sync');
            }}
          >
            <span className={`material-symbols-outlined text-[18px] ${inv.isLoading ? 'animate-spin' : ''}`}>sync</span>
            <span>{inv.isLoading ? 'Đang tải...' : 'Làm mới dữ liệu'}</span>
          </button>
          <button
            id="btn-add-inventory"
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-container text-on-primary-container font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-primary hover:text-on-primary transition-colors shadow-sm"
            onClick={inv.openAddModal}
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Khai báo tồn kho</span>
          </button>
        </div>
      </div>

      <div className="w-full px-margin py-space-lg flex flex-col gap-space-lg">
        <InventoryKPICards summary={inv.summary} activeStatus={inv.filterStatus} onSelectStatus={inv.setFilterStatus} />

        <InventoryFilterBar
          search={inv.search} onSearch={inv.setSearch}
          warehouses={inv.warehouses} filterWarehouse={inv.filterWarehouse} onWarehouse={inv.setFilterWarehouse}
          products={inv.products} filterProduct={inv.filterProduct} onProduct={inv.setFilterProduct}
          filterStatus={inv.filterStatus} onStatus={inv.setFilterStatus}
          hasActiveFilter={inv.hasActiveFilter} onReset={inv.resetFilters}
        />

        <InventoryTable
          items={inv.items}
          total={inv.summary.totalItems}
          isLoading={inv.isLoading}
          loadError={inv.loadError}
          onAdjust={inv.openAdjustModal}
          onEditLocation={inv.openLocationModal}
          onRetry={inv.fetchInventory}
        />
      </div>

      <InventoryModal
        modal={inv.modal} form={inv.form} setForm={inv.setForm}
        errors={inv.errors} isSaving={inv.isSaving}
        products={inv.products} warehouses={inv.warehouses}
        onClose={inv.closeModal} onSave={inv.saveModal}
      />

      <ToastNotification visible={inv.toast.visible} text={inv.toast.text} icon={inv.toast.icon} />
    </div>
  );
}
