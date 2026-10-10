/**
 * WarehousePage – Trang "Danh sách chi nhánh kho" (Sprint3-13: Warehouse UI).
 *
 * Cấu trúc file trong thư mục này:
 *   WarehousePage.jsx        ← page chính (file này) – chỉ lắp ráp components
 *   WarehousePage.css        ← CSS bổ sung nếu Tailwind chưa đủ
 *   WarehouseKPICards.jsx    ← 4 thẻ KPI
 *   WarehouseFilterBar.jsx   ← thanh tìm kiếm + filter
 *   WarehouseTable.jsx       ← bảng dữ liệu kho
 *   WarehouseModal.jsx       ← modal thêm / chỉnh sửa kho
 *   StatusConfirmModal.jsx   ← dialog xác nhận toggle trạng thái
 *   ToastNotification.jsx    ← thanh toast góc dưới phải
 *
 * Logic & state → warehouseState.js
 */
import { useWarehouse } from "./warehouseState";
import WarehouseKPICards from "./WarehouseKPICards";
import WarehouseFilterBar from "./WarehouseFilterBar";
import WarehouseTable from "./WarehouseTable";
import WarehouseModal from "./WarehouseModal";
import StatusConfirmModal from "./StatusConfirmModal";
import ToastNotification from "./ToastNotification";

export default function WarehousePage() {
  const hook = useWarehouse();

  return (
    <div className="flex flex-col w-full">

      {/* ── Breadcrumb + Page title + Action buttons ── */}
      <div className="w-full px-margin py-space-md flex flex-col md:flex-row md:items-center md:justify-between gap-space-md bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col gap-0.5">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-space-xs text-secondary font-label-default text-label-default">
            <a className="hover:text-primary transition-colors flex items-center gap-1" href="#">
              <span className="material-symbols-outlined text-[16px]">home</span>
              <span>Trang chủ</span>
            </a>
            <span className="text-outline-variant">/</span>
            <a className="hover:text-primary transition-colors" href="#">Quản lý Kho bãi</a>
            <span className="text-outline-variant">/</span>
            <span className="text-on-surface font-body-sm-medium">Danh sách chi nhánh kho</span>
          </nav>

          {/* Title */}
          <div className="flex items-center gap-space-sm mt-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              Danh sách chi nhánh kho
            </h1>
            <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container text-primary font-body-sm-medium">
              {hook.warehouses.length} chi nhánh
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container-low text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              Dữ liệu từ hệ thống
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center flex-wrap gap-space-sm">
          <button
            id="btn-refresh-data"
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-surface-container-high transition-colors"
            onClick={async () => {
              const refreshed = await hook.fetchWarehouses();
              if (refreshed) hook.showToast("Đã cập nhật dữ liệu kho mới nhất", "sync");
            }}
          >
            <span className={`material-symbols-outlined text-[18px] ${hook.isLoading ? "animate-spin" : ""}`}>sync</span>
            <span>{hook.isLoading ? "Đang tải..." : "Làm mới dữ liệu"}</span>
          </button>
          <button
            id="btn-add-warehouse"
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-container text-on-primary-container font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-primary hover:text-on-primary transition-colors shadow-sm"
            onClick={hook.openAddModal}
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Thêm mới chi nhánh kho</span>
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="w-full px-margin py-space-lg flex flex-col gap-space-lg">

        {/* KPI Cards */}
        <WarehouseKPICards warehouses={hook.warehouses} />

        {/* Filter Bar */}
        <WarehouseFilterBar
          search={hook.search}
          onSearchChange={hook.setSearch}
          filterRegion={hook.filterRegion}
          onRegionChange={hook.setFilterRegion}
          filterType={hook.filterType}
          onTypeChange={hook.setFilterType}
          filterStatus={hook.filterStatus}
          onStatusChange={hook.setFilterStatus}
          onReset={hook.resetFilters}
          selectedCount={hook.selectedCodes.size}
          onBulkPause={() => hook.showToast("Đã tạm dừng các kho được chọn", "pause_circle")}
          onBulkPrint={() => hook.showToast("Đang in mã định danh...", "print")}
          onBulkDelete={() => hook.showToast("Vui lòng xác nhận trước khi xóa", "warning")}
        />

        {/* Data Table */}
        <WarehouseTable
          warehouses={hook.filteredWarehouses}
          selectedCodes={hook.selectedCodes}
          isAllSelected={hook.isAllSelected}
          onSelectAll={hook.toggleSelectAll}
          onSelect={hook.toggleSelect}
          onToggleStatus={hook.requestToggleStatus}
          onEdit={hook.openEditModal}
          onPreview={hook.previewLayout}
          onCopyCode={hook.copyCode}
        />
      </div>

      {/* ── Modals ── */}
      {hook.warehouseModal.open && (
        <WarehouseModal
          mode={hook.warehouseModal.mode}
          data={hook.warehouseModal.data}
          form={hook.form}
          setForm={hook.setForm}
          activeTab={hook.activeTab}
          setActiveTab={hook.setActiveTab}
          onSave={hook.saveWarehouse}
          onClose={hook.closeWarehouseModal}
          errors={hook.errors}
          isSaving={hook.isSaving}
        />
      )}

      {hook.statusModal.open && (
        <StatusConfirmModal
          code={hook.statusModal.code}
          newState={hook.statusModal.newState}
          reason={hook.statusModal.reason}
          onReasonChange={(val) => hook.setStatusModal((m) => ({ ...m, reason: val }))}
          onConfirm={hook.confirmToggleStatus}
          onCancel={hook.cancelToggleStatus}
        />
      )}

      {/* ── Toast ── */}
      <ToastNotification
        visible={hook.toast.visible}
        text={hook.toast.text}
        icon={hook.toast.icon}
      />
    </div>
  );
}
