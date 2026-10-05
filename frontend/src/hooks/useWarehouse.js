/**
 * useWarehouse – quản lý toàn bộ state, API calls & logic cho trang Warehouse UI.
 * Sprint3-13 (UI) + Sprint3-14 (API Integration) + Sprint3-15 (Validation & Error Handling).
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { warehouseApi } from "../api/warehouseApi";
import { ApiClientError } from "../api/ApiClientError";

// ── Demo data for UI previews; the page loads persisted rows from the API. ──
export const INITIAL_WAREHOUSES = [
  {
    code: "KHO-SGN01",
    name: "Kho Logistics Tân Tạo - TP.HCM",
    description: "Hub trung tâm phân phối chính Miền Nam",
    region: "south",
    type: "fulfillment",
    typeLabel: "Fulfillment Hub",
    typeIcon: "local_shipping",
    address: "Lô 12, KCN Tân Tạo, Q. Bình Tân, TP. Hồ Chí Minh",
    area: "18,500 m²",
    capacity: 16000,
    used: 14200,
    manager: { name: "Lý Nguyễn", initials: "LN", phone: "0908.123.456", color: "bg-primary text-on-primary" },
    status: "active",
  },
  {
    code: "KHO-HAN02",
    name: "Kho Phân phối Quang Minh - Hà Nội",
    description: "Trung chuyển hàng hóa cao tốc Bắc Nam",
    region: "north",
    type: "crossdock",
    typeLabel: "Cross-dock",
    typeIcon: "swap_horiz",
    address: "KCN Quang Minh, H. Mê Linh, Hà Nội",
    area: "11,200 m²",
    capacity: 9500,
    used: 7850,
    manager: { name: "Trần Hoàng", initials: "TH", phone: "0912.889.922", color: "bg-tertiary text-on-tertiary" },
    status: "active",
  },
  {
    code: "KHO-BDG01",
    name: "Kho Trung tâm Sóng Thần - Bình Dương",
    description: "Kho bách hóa và vật tư công nghiệp nặng",
    region: "south",
    type: "standard",
    typeLabel: "Kho tiêu chuẩn",
    typeIcon: "warehouse",
    address: "Đại lộ Độc Lập, KCN Sóng Thần 1, Dĩ An, Bình Dương",
    area: "14,000 m²",
    capacity: 12000,
    used: 9120,
    manager: { name: "Vũ Mạnh", initials: "VM", phone: "0933.456.789", color: "bg-secondary text-on-secondary" },
    status: "active",
  },
  {
    code: "KHO-DAD01",
    name: "Kho Trung chuyển Hòa Khánh - Đà Nẵng",
    description: "Cửa ngõ logistics vùng kinh tế trọng điểm Miền Trung",
    region: "central",
    type: "crossdock",
    typeLabel: "Cross-dock",
    typeIcon: "swap_horiz",
    address: "Đường số 4, KCN Hòa Khánh, Q. Liên Chiểu, Đà Nẵng",
    area: "5,600 m²",
    capacity: 4500,
    used: 3200,
    manager: { name: "Đặng Phong", initials: "ĐP", phone: "0987.654.321", color: "bg-primary-container text-on-primary-container" },
    status: "active",
  },
  {
    code: "KHO-SGN02",
    name: "Kho Lạnh Cát Lái - TP. Thủ Đức",
    description: "Nhiệt độ âm sâu -18°C đến -25°C cho thủy hải sản & dược",
    region: "south",
    type: "cold",
    typeLabel: "Kho mát/lạnh",
    typeIcon: "ac_unit",
    address: "Cụm cảng Cát Lái, P. Cát Lái, TP. Thủ Đức, TP.HCM",
    area: "4,800 m²",
    capacity: 4000,
    used: 3980,
    manager: { name: "Hà Quang", initials: "HQ", phone: "0903.771.882", color: "bg-tertiary-container text-on-tertiary-container" },
    status: "active",
  },
  {
    code: "KHO-DNI01",
    name: "Kho Phân phối Long Thành - Đồng Nai",
    description: "Đang bảo trì hệ thống AGV & băng tải tự động",
    region: "south",
    type: "fulfillment",
    typeLabel: "Fulfillment Hub",
    typeIcon: "local_shipping",
    address: "KCN Lộc An - Bình Sơn, H. Long Thành, Đồng Nai",
    area: "4,200 m²",
    capacity: 3000,
    used: 1400,
    manager: { name: "Phạm Long", initials: "PL", phone: "0977.112.334", color: "bg-surface-container-high text-on-surface" },
    status: "maintenance",
  },
  {
    code: "KHO-HPG01",
    name: "Kho Cảng Đình Vũ - Hải Phòng",
    description: "Kho ngoại quan & tập kết công hàng cảng biển",
    region: "north",
    type: "standard",
    typeLabel: "Kho tiêu chuẩn",
    typeIcon: "warehouse",
    address: "Khu kinh tế Đình Vũ, Q. Hải An, Hải Phòng",
    area: "3,200 m²",
    capacity: 2000,
    used: 1800,
    manager: { name: "Ngô Văn", initials: "NV", phone: "0918.332.991", color: "bg-secondary-fixed text-on-secondary-fixed" },
    status: "active",
  },
  {
    code: "KHO-CTH01",
    name: "Kho Vận Trà Nóc - Cần Thơ",
    description: "Khu vực Tây Nam Bộ (Tạm dừng dịch chuyển mặt bằng)",
    region: "south",
    type: "standard",
    typeLabel: "Kho tiêu chuẩn",
    typeIcon: "warehouse",
    address: "KCN Trà Nóc 1, Q. Bình Thủy, Cần Thơ",
    area: "3,000 m²",
    capacity: 2000,
    used: 0,
    manager: { name: "Lê Dũng", initials: "LD", phone: "0945.667.112", color: "bg-surface-container-high text-secondary" },
    status: "inactive",
  },
];

// Helper chuẩn hóa thực thể từ backend về shape của UI
function normalizeWarehouse(item, index = 0) {
  const statusLower = (item.status || "active").toLowerCase();
  const colors = [
    "bg-primary text-on-primary",
    "bg-secondary text-on-secondary",
    "bg-tertiary text-on-tertiary",
    "bg-primary-container text-on-primary-container",
  ];
  const typeDetails = {
    standard: { label: "Kho tiêu chuẩn", icon: "warehouse" },
    cold: { label: "Kho mát/lạnh", icon: "ac_unit" },
    crossdock: { label: "Cross-dock", icon: "swap_horiz" },
    fulfillment: { label: "Fulfillment Hub", icon: "local_shipping" },
  };
  const type = item.type || "standard";
  const areaValue = item.area == null ? "" : Number(item.area);
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description || "",
    region: item.region || "north",
    type,
    typeLabel: typeDetails[type]?.label || typeDetails.standard.label,
    typeIcon: typeDetails[type]?.icon || typeDetails.standard.icon,
    address: item.address,
    area: areaValue === "" ? "Chưa cập nhật" : `${areaValue.toLocaleString("vi-VN")} m²`,
    areaValue,
    capacity: item.capacity ?? 0,
    used: item.used ?? 0,
    height: item.height ?? "",
    docks: item.docks ?? "",
    floorLoad: item.floorLoad ?? "",
    manager: {
      name: item.managerName || "Chưa phân công",
      initials: (item.managerName || "KH").trim().split(/\s+/).map((part) => part[0]).slice(-2).join("").toUpperCase(),
      phone: item.phone || "---",
      email: item.managerEmail || "",
      color: colors[index % colors.length],
    },
    security: item.security || "",
    barcodeEnabled: item.barcodeEnabled ?? true,
    status: statusLower,
  };
}

const DEFAULT_FORM = {
  code: "",
  name: "",
  type: "standard",
  region: "north",
  address: "",
  notes: "",
  area: "",
  capacity: "",
  height: "",
  docks: "",
  floorLoad: "",
  manager: "",
  phone: "",
  email: "",
  security: "",
  isActive: true,
  barcodeEnabled: true,
};

export function useWarehouse() {
  // ── State dữ liệu ────────────────────────────────────────────────────
  const [warehouses, setWarehouses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [search, setSearch] = useState("");
  const [filterRegion, setFilterRegion] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedCodes, setSelectedCodes] = useState(new Set());

  // ── State modal ──────────────────────────────────────────────────────
  const [warehouseModal, setWarehouseModal] = useState({ open: false, mode: "add", data: null });
  const [statusModal, setStatusModal] = useState({ open: false, code: "", newState: false, reason: "" });
  const [activeTab, setActiveTab] = useState("general");
  const [form, setForm] = useState(DEFAULT_FORM);

  // ── Toast ────────────────────────────────────────────────────────────
  const [toast, setToast] = useState({ visible: false, text: "", icon: "check_circle" });
  const toastTimer = useRef(null);

  const showToast = useCallback((text, icon = "check_circle") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, text, icon });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }, []);

  // ── Fetch dữ liệu từ backend API ─────────────────────────────────────
  const fetchWarehouses = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await warehouseApi.getAll();
      if (!Array.isArray(data)) {
        throw new Error("Backend trả về danh sách kho không hợp lệ.");
      }
      setWarehouses(data.map((item, idx) => normalizeWarehouse(item, idx)));
    } catch (err) {
      showToast(err.message || "Không thể tải danh sách kho từ máy chủ.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  // ── Lọc danh sách ────────────────────────────────────────────────────
  const filteredWarehouses = warehouses.filter((w) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      w.code.toLowerCase().includes(q) ||
      w.name.toLowerCase().includes(q) ||
      w.address.toLowerCase().includes(q) ||
      (w.manager?.name && w.manager.name.toLowerCase().includes(q));
    const matchRegion = filterRegion === "all" || w.region === filterRegion;
    const matchType = filterType === "all" || w.type === filterType;
    const matchStatus = filterStatus === "all" || w.status === filterStatus;
    return matchSearch && matchRegion && matchType && matchStatus;
  });

  // ── Checkbox chọn hàng ───────────────────────────────────────────────
  const toggleSelect = useCallback((code) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(
    (checked) => {
      setSelectedCodes(checked ? new Set(filteredWarehouses.map((w) => w.code)) : new Set());
    },
    [filteredWarehouses]
  );

  const isAllSelected =
    filteredWarehouses.length > 0 && filteredWarehouses.every((w) => selectedCodes.has(w.code));

  // ── Mở modal thêm mới ────────────────────────────────────────────────
  const openAddModal = useCallback(() => {
    setForm({ ...DEFAULT_FORM, code: `KHO-${Math.floor(1000 + Math.random() * 9000)}` });
    setErrors({});
    setActiveTab("general");
    setWarehouseModal({ open: true, mode: "add", data: null });
  }, []);

  // ── Mở modal chỉnh sửa ───────────────────────────────────────────────
  const openEditModal = useCallback((code) => {
    const w = warehouses.find((x) => x.code === code) || { code };
    setForm({
      ...DEFAULT_FORM,
      code: w.code,
      name: w.name || "",
      type: w.type || "standard",
      region: w.region || "north",
      address: w.address || "",
      area: w.areaValue === "" ? "" : String(w.areaValue),
      capacity: String(w.capacity ?? ""),
      height: w.height === "" ? "" : String(w.height),
      docks: w.docks === "" ? "" : String(w.docks),
      floorLoad: w.floorLoad === "" ? "" : String(w.floorLoad),
      manager: w.manager?.name || "",
      phone: w.manager?.phone || "",
      email: w.manager?.email || "",
      security: w.security || "",
      notes: w.description || "",
      barcodeEnabled: w.barcodeEnabled,
      isActive: w.status === "active",
    });
    setErrors({});
    setActiveTab("general");
    setWarehouseModal({ open: true, mode: "edit", data: w });
  }, [warehouses]);

  const closeWarehouseModal = useCallback(() => {
    setWarehouseModal((m) => ({ ...m, open: false }));
    setErrors({});
  }, []);

  // ── Lưu form (Sprint3-14 & 15: Validations + API Integration) ────────
  const saveWarehouse = useCallback(async () => {
    const newErrors = {};

    if (!form.code || !form.code.trim()) {
      newErrors.code = "Mã kho không được để trống";
    } else if (!/^[A-Z0-9-]+$/i.test(form.code.trim())) {
      newErrors.code = "Mã kho chỉ được chứa chữ in hoa, số và dấu gạch ngang";
    } else if (form.code.trim().length < 3 || form.code.trim().length > 20) {
      newErrors.code = "Mã kho phải từ 3 đến 20 ký tự";
    }

    if (!form.name || !form.name.trim()) {
      newErrors.name = "Tên kho không được để trống";
    }

    if (!form.address || !form.address.trim()) {
      newErrors.address = "Địa chỉ kho không được để trống";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setActiveTab("general");
      showToast("Vui lòng điền đầy đủ các thông tin bắt buộc", "error");
      return;
    }

    setIsSaving(true);
    setErrors({});

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone ? form.phone.trim() : null,
      description: form.notes.trim() || null,
      region: form.region,
      type: form.type,
      area: form.area === "" ? null : Number(form.area),
      capacity: form.capacity === "" ? 0 : Number(form.capacity),
      height: form.height === "" ? null : Number(form.height),
      docks: form.docks === "" ? null : Number(form.docks),
      floorLoad: form.floorLoad === "" ? null : Number(form.floorLoad),
      managerName: form.manager.trim() || null,
      managerEmail: form.email.trim() || null,
      security: form.security.trim() || null,
      barcodeEnabled: form.barcodeEnabled,
      status: form.isActive
        ? "ACTIVE"
        : warehouseModal.data?.status === "maintenance"
          ? "MAINTENANCE"
          : "INACTIVE",
    };

    try {
      if (warehouseModal.mode === "add") {
        const created = await warehouseApi.create(payload);
        setWarehouses((prev) => [normalizeWarehouse(created, prev.length), ...prev]);
        showToast(`Đã tạo chi nhánh kho ${payload.code} thành công!`, "check_circle");
      } else {
        const existing = warehouseModal.data;
        if (!existing?.id) {
          throw new Error("Không xác định được chi nhánh kho cần cập nhật.");
        }
        const updated = await warehouseApi.update(existing.id, payload);
        setWarehouses((prev) => {
          const index = prev.findIndex((w) => w.id === updated.id);
          return prev.map((w, currentIndex) =>
            currentIndex === index ? normalizeWarehouse(updated, currentIndex) : w
          );
        });
        showToast(`Đã cập nhật chi nhánh kho ${payload.code} thành công!`, "check_circle");
      }
      closeWarehouseModal();
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.status === 409 || err.code === "DUPLICATE_WAREHOUSE_CODE") {
          setErrors({ code: "Mã kho đã tồn tại trong hệ thống" });
          setActiveTab("general");
        } else if (err.details && Array.isArray(err.details)) {
          const fieldErrs = {};
          err.details.forEach((d) => {
            const [field, msg] = d.split(": ");
            if (field && msg) fieldErrs[field] = msg;
          });
          setErrors(fieldErrs);
        } else {
          setErrors({ general: err.message });
        }
        showToast(err.message, "error");
      } else {
        setErrors({ general: err.message || "Không thể lưu dữ liệu" });
        showToast(err.message || "Lỗi lưu dữ liệu", "error");
      }
    } finally {
      setIsSaving(false);
    }
  }, [form, warehouseModal, closeWarehouseModal, showToast]);

  // ── Toggle trạng thái kho ────────────────────────────────────────────
  const requestToggleStatus = useCallback((code, newState) => {
    setStatusModal({ open: true, code, newState, reason: "" });
  }, []);

  const confirmToggleStatus = useCallback(async () => {
    const { code, newState } = statusModal;
    const target = warehouses.find((w) => w.code === code);
    const newStatusStr = newState ? "ACTIVE" : "INACTIVE";

    try {
      if (!target?.id) {
        throw new Error("Không xác định được chi nhánh kho cần cập nhật trạng thái.");
      }
      await warehouseApi.updateStatus(target.id, newStatusStr);
    } catch (err) {
      showToast(err.message || "Không thể cập nhật trạng thái kho.", "error");
      return;
    }

    setWarehouses((prev) =>
      prev.map((w) =>
        w.code === code ? { ...w, status: newState ? "active" : "inactive" } : w
      )
    );
    setStatusModal((m) => ({ ...m, open: false }));
    showToast(
      newState
        ? `Đã chuyển kho ${code} sang trạng thái Hoạt động`
        : `Đã tạm dừng hoạt động kho ${code}`,
      newState ? "check_circle" : "warning"
    );
  }, [statusModal, warehouses, showToast]);

  const cancelToggleStatus = useCallback(() => {
    setStatusModal((m) => ({ ...m, open: false }));
  }, []);

  // ── Xóa kho ──────────────────────────────────────────────────────────
  const deleteWarehouse = useCallback(
    async (code) => {
      const target = warehouses.find((w) => w.code === code);
      try {
        if (!target?.id) {
          throw new Error("Không xác định được kho cần xóa.");
        }
        await warehouseApi.delete(target.id);
        setWarehouses((prev) => prev.filter((w) => w.code !== code));
        showToast(`Đã xóa kho ${code} thành công`, "delete");
      } catch (err) {
        showToast(err.message || `Lỗi khi xóa kho ${code}`, "error");
      }
    },
    [warehouses, showToast]
  );

  // ── Helpers ──────────────────────────────────────────────────────────
  const copyCode = useCallback(
    (code) => {
      navigator.clipboard.writeText(code).catch(() => {});
      showToast(`Đã sao chép mã kho: ${code}`, "content_copy");
    },
    [showToast]
  );

  const previewLayout = useCallback(
    (code) => showToast(`Đang mở sơ đồ mặt bằng kệ bãi: ${code}`, "map"),
    [showToast]
  );

  const resetFilters = useCallback(() => {
    setSearch("");
    setFilterRegion("all");
    setFilterType("all");
    setFilterStatus("all");
    showToast("Đã đặt lại tất cả bộ lọc", "refresh");
  }, [showToast]);

  return {
    // Data
    warehouses,
    filteredWarehouses,
    selectedCodes,
    isAllSelected,
    isLoading,
    isSaving,
    errors,
    fetchWarehouses,
    deleteWarehouse,
    // Filters
    search, setSearch,
    filterRegion, setFilterRegion,
    filterType, setFilterType,
    filterStatus, setFilterStatus,
    resetFilters,
    // Modal warehouse
    warehouseModal,
    openAddModal,
    openEditModal,
    closeWarehouseModal,
    saveWarehouse,
    activeTab, setActiveTab,
    form, setForm,
    // Modal status
    statusModal,
    setStatusModal,
    requestToggleStatus,
    confirmToggleStatus,
    cancelToggleStatus,
    // Checkbox
    toggleSelect,
    toggleSelectAll,
    // Helpers
    copyCode,
    previewLayout,
    showToast,
    // Toast
    toast,
  };
}
