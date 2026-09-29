/**
 * StatusBadge – hiển thị trạng thái của kho với màu sắc tương ứng.
 */
function StatusBadge({ status }) {
  const map = {
    active: {
      cls: "bg-surface-container-low text-primary",
      dot: "bg-primary-container",
      label: "Hoạt động",
    },
    maintenance: {
      cls: "bg-surface-container-high text-secondary",
      dot: "bg-secondary",
      label: "Đang bảo trì",
    },
    inactive: {
      cls: "bg-error-container text-on-error-container",
      dot: "bg-error",
      label: "Ngưng hoạt động",
    },
  };
  const s = map[status] || map.inactive;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-sm text-label-sm ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

/**
 * TypeBadge – hiển thị loại kho.
 */
function TypeBadge({ type, typeLabel, typeIcon }) {
  const clsMap = {
    fulfillment: "bg-secondary-container text-on-secondary-fixed",
    crossdock: "bg-tertiary-fixed text-on-tertiary-fixed",
    cold: "bg-tertiary-fixed-dim text-on-tertiary-fixed",
    standard: "bg-surface-container text-on-surface",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-sm text-label-sm ${clsMap[type] || clsMap.standard}`}
    >
      <span className="material-symbols-outlined text-[14px]">{typeIcon}</span>
      {typeLabel}
    </span>
  );
}

/**
 * CapacityBar – thanh tiến trình lấp đầy pallet.
 */
function CapacityBar({ used, capacity, area }) {
  const pct = capacity ? Math.min((used / capacity) * 100, 100).toFixed(1) : 0;
  const barColor = pct >= 95 ? "bg-error" : pct >= 80 ? "bg-primary-container" : "bg-primary-container";
  const textColor = pct >= 95 ? "text-error" : "text-primary";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between font-label-sm text-label-sm">
        <span className="font-body-sm-medium text-on-surface">
          {used.toLocaleString("vi-VN")} / {capacity.toLocaleString("vi-VN")}
        </span>
        <span className={`font-bold ${textColor}`}>{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-label-sm text-label-sm text-secondary">Diện tích: {area}</span>
    </div>
  );
}

/**
 * WarehouseTableRow – một dòng trong bảng danh sách kho.
 */
function WarehouseTableRow({ warehouse, isSelected, onSelect, onToggleStatus, onEdit, onPreview, onCopyCode }) {
  const { code, name, description, region: _region, type, typeLabel, typeIcon, address, area, capacity, used, manager, status } =
    warehouse;
  const isActive = status === "active";

  return (
    <tr className="hover:bg-surface-container-low/60 transition-colors">
      {/* Checkbox */}
      <td className="py-3 px-4 text-center">
        <input
          className="w-4 h-4 rounded cursor-pointer accent-primary"
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(code)}
          aria-label={`Chọn kho ${code}`}
        />
      </td>

      {/* Mã kho */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5 font-code-mono text-code-mono font-bold text-primary">
          <span>{code}</span>
          <button
            className="text-secondary hover:text-primary p-0.5 rounded"
            onClick={() => onCopyCode(code)}
            title="Sao chép mã"
          >
            <span className="material-symbols-outlined text-[15px]">content_copy</span>
          </button>
        </div>
      </td>

      {/* Tên chi nhánh */}
      <td className="py-3 px-4">
        <div className="flex flex-col">
          <span className="font-body-sm-medium text-body-sm-medium text-on-surface">{name}</span>
          <span className="font-label-sm text-label-sm text-secondary">{description}</span>
        </div>
      </td>

      {/* Địa chỉ */}
      <td className="py-3 px-4">
        <div className="flex items-start gap-1 text-on-surface-variant">
          <span className="material-symbols-outlined text-secondary text-[16px] mt-0.5 shrink-0">location_on</span>
          <span className="line-clamp-2 font-body-sm text-body-sm">{address}</span>
        </div>
      </td>

      {/* Phân loại */}
      <td className="py-3 px-4">
        <TypeBadge type={type} typeLabel={typeLabel} typeIcon={typeIcon} />
      </td>

      {/* Sức chứa */}
      <td className="py-3 px-4">
        <CapacityBar used={used} capacity={capacity} area={area} />
      </td>

      {/* Người phụ trách */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full ${manager.color} font-label-sm flex items-center justify-center font-bold`}>
            {manager.initials}
          </div>
          <div className="flex flex-col">
            <span className="font-body-sm-medium text-body-sm-medium">{manager.name}</span>
            <span className="font-label-sm text-label-sm text-secondary">{manager.phone}</span>
          </div>
        </div>
      </td>

      {/* Trạng thái + Toggle */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              className="sr-only peer"
              type="checkbox"
              checked={isActive}
              onChange={(e) => onToggleStatus(code, e.target.checked)}
              aria-label={`Toggle trạng thái kho ${code}`}
            />
            <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-container" />
          </label>
          <StatusBadge status={status} />
        </div>
      </td>

      {/* Thao tác */}
      <td className="py-3 px-4 text-right">
        <div className="inline-flex items-center gap-1 justify-end">
          <button
            className="p-1 rounded text-secondary hover:text-primary hover:bg-surface-container-high transition-colors"
            onClick={() => onEdit(code)}
            title="Chỉnh sửa thông tin"
          >
            <span className="material-symbols-outlined text-[18px]">edit_square</span>
          </button>
          <button
            className="p-1 rounded text-secondary hover:text-primary hover:bg-surface-container-high transition-colors"
            onClick={() => onPreview(code)}
            title="Xem sơ đồ kệ bãi"
          >
            <span className="material-symbols-outlined text-[18px]">grid_view</span>
          </button>
          <button
            className="p-1 rounded text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors"
            title="Tùy chọn khác"
          >
            <span className="material-symbols-outlined text-[18px]">more_vert</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

/**
 * WarehouseTable – bảng đầy đủ: header, body rows, footer + pagination.
 */
export default function WarehouseTable({
  warehouses,
  selectedCodes,
  isAllSelected,
  onSelectAll,
  onSelect,
  onToggleStatus,
  onEdit,
  onPreview,
  onCopyCode,
}) {
  return (
    <div className="rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse" id="warehouseTable">
          {/* ── Table Head ── */}
          <thead>
            <tr className="bg-surface-container-low text-secondary font-label-default text-label-default uppercase tracking-wider">
              <th className="py-3 px-4 w-10 text-center" scope="col">
                <input
                  className="w-4 h-4 rounded cursor-pointer accent-primary"
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  aria-label="Chọn tất cả"
                />
              </th>
              <th className="py-3 px-4 min-w-[120px]" scope="col">Mã kho</th>
              <th className="py-3 px-4 min-w-[240px]" scope="col">Tên chi nhánh kho</th>
              <th className="py-3 px-4 min-w-[200px]" scope="col">Khu vực & Địa chỉ</th>
              <th className="py-3 px-4 min-w-[140px]" scope="col">Phân loại</th>
              <th className="py-3 px-4 min-w-[180px]" scope="col">Sức chứa & Lấp đầy</th>
              <th className="py-3 px-4 min-w-[170px]" scope="col">Người phụ trách</th>
              <th className="py-3 px-4 min-w-[150px]" scope="col">Trạng thái</th>
              <th className="py-3 px-4 text-right min-w-[120px]" scope="col">Thao tác</th>
            </tr>
          </thead>

          {/* ── Table Body ── */}
          <tbody className="font-body-sm text-body-sm text-on-surface">
            {warehouses.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-secondary font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[48px] block mb-2 opacity-30">search_off</span>
                  Không tìm thấy chi nhánh kho phù hợp
                </td>
              </tr>
            ) : (
              warehouses.map((w) => (
                <WarehouseTableRow
                  key={w.code}
                  warehouse={w}
                  isSelected={selectedCodes.has(w.code)}
                  onSelect={onSelect}
                  onToggleStatus={onToggleStatus}
                  onEdit={onEdit}
                  onPreview={onPreview}
                  onCopyCode={onCopyCode}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Table Footer ── */}
      <div className="p-space-md bg-surface-container-lowest flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-md font-body-sm text-body-sm text-secondary">
        <div className="flex items-center gap-space-md">
          <span>
            Hiển thị <strong>1 – {warehouses.length}</strong> trong tổng số{" "}
            <strong>{warehouses.length}</strong> chi nhánh kho
          </span>
          <div className="flex items-center gap-2">
            <span className="text-label-sm font-label-sm">Số dòng:</span>
            <select className="h-8 px-2 bg-surface-container-low text-on-surface rounded text-label-sm font-label-sm outline-none cursor-pointer">
              <option value="10">10 dòng / trang</option>
              <option value="20">20 dòng / trang</option>
              <option value="50">50 dòng / trang</option>
            </select>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 rounded bg-surface-container text-outline cursor-not-allowed flex items-center justify-center"
            disabled
            aria-label="Trang trước"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <button className="w-8 h-8 rounded bg-primary-container text-on-primary-container font-body-sm-medium flex items-center justify-center">
            1
          </button>
          <button
            className="p-1.5 rounded bg-surface-container text-outline cursor-not-allowed flex items-center justify-center"
            disabled
            aria-label="Trang sau"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
}
