/**
 * WarehouseFilterBar – Thanh tìm kiếm + 3 dropdown lọc + nút reset.
 */
export default function WarehouseFilterBar({
  search, onSearchChange,
  filterRegion, onRegionChange,
  filterType, onTypeChange,
  filterStatus, onStatusChange,
  onReset,
  selectedCount,
  onBulkPause,
  onBulkPrint,
  onBulkDelete,
}) {
  return (
    <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm items-center">

        {/* ── Search input ── */}
        <div className="md:col-span-5 relative flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-secondary text-[18px]">search</span>
          <input
            id="warehouse-search"
            className="w-full h-9 pl-9 pr-8 bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-lg outline-none placeholder:text-outline focus:bg-surface-container-lowest transition-all"
            placeholder="Tìm theo mã kho, tên kho, địa chỉ, quản lý..."
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {search && (
            <button
              className="absolute right-2 text-secondary hover:text-on-surface p-1"
              onClick={() => onSearchChange("")}
              aria-label="Xóa tìm kiếm"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* ── Filter: Region ── */}
        <div className="md:col-span-2">
          <div className="relative flex items-center">
            <select
              id="filter-region"
              className="w-full h-9 px-3 bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-lg outline-none cursor-pointer appearance-none"
              value={filterRegion}
              onChange={(e) => onRegionChange(e.target.value)}
            >
              <option value="all">Tất cả khu vực</option>
              <option value="north">Miền Bắc</option>
              <option value="central">Miền Trung</option>
              <option value="south">Miền Nam</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 pointer-events-none text-secondary text-[18px]">
              expand_more
            </span>
          </div>
        </div>

        {/* ── Filter: Type ── */}
        <div className="md:col-span-2">
          <div className="relative flex items-center">
            <select
              id="filter-type"
              className="w-full h-9 px-3 bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-lg outline-none cursor-pointer appearance-none"
              value={filterType}
              onChange={(e) => onTypeChange(e.target.value)}
            >
              <option value="all">Tất cả phân loại</option>
              <option value="cold">Kho mát / Kho lạnh</option>
              <option value="crossdock">Kho Cross-dock</option>
              <option value="fulfillment">Kho Fulfillment</option>
              <option value="standard">Kho tiêu chuẩn</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 pointer-events-none text-secondary text-[18px]">
              expand_more
            </span>
          </div>
        </div>

        {/* ── Filter: Status ── */}
        <div className="md:col-span-2">
          <div className="relative flex items-center">
            <select
              id="filter-status"
              className="w-full h-9 px-3 bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-lg outline-none cursor-pointer appearance-none"
              value={filterStatus}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Ngưng hoạt động</option>
              <option value="maintenance">Đang bảo trì</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 pointer-events-none text-secondary text-[18px]">
              expand_more
            </span>
          </div>
        </div>

        {/* ── Reset button ── */}
        <div className="md:col-span-1 flex items-center justify-end">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container-low hover:bg-surface-container-high text-secondary hover:text-on-surface transition-colors"
            onClick={onReset}
            title="Đặt lại bộ lọc"
          >
            <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
          </button>
        </div>
      </div>

      {/* ── Bulk action bar (hiện khi có hàng được chọn) ── */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-surface-container-low rounded-lg animate-fadeIn">
          <span className="font-body-sm-medium text-body-sm-medium text-primary">
            Đã chọn: <span>{selectedCount}</span> kho
          </span>
          <div className="flex items-center gap-space-sm">
            <button
              className="px-2.5 py-1 text-label-default font-label-default bg-surface-container-lowest hover:bg-surface-container-high text-on-surface rounded-lg transition-colors flex items-center gap-1"
              onClick={onBulkPause}
            >
              <span className="material-symbols-outlined text-[16px]">pause_circle</span> Tạm dừng hàng loạt
            </button>
            <button
              className="px-2.5 py-1 text-label-default font-label-default bg-surface-container-lowest hover:bg-surface-container-high text-on-surface rounded-lg transition-colors flex items-center gap-1"
              onClick={onBulkPrint}
            >
              <span className="material-symbols-outlined text-[16px]">print</span> In mã định danh
            </button>
            <button
              className="px-2.5 py-1 text-label-default font-label-default bg-surface-container-lowest hover:bg-surface-container-high text-error rounded-lg transition-colors flex items-center gap-1"
              onClick={onBulkDelete}
            >
              <span className="material-symbols-outlined text-[16px]">delete</span> Xóa lựa chọn
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
