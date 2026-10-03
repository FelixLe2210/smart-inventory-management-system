import { useState } from "react";

/* ─── Tab button ──────────────────────────────────────────────────────── */
function TabBtn({ id, icon, label, active, onClick }) {
  return (
    <button
      type="button"
      className={`modal-tab-btn py-3 relative flex items-center gap-1.5 font-body-sm-medium text-body-sm-medium transition-colors ${
        active ? "text-primary" : "text-secondary hover:text-on-surface"
      }`}
      onClick={() => onClick(id)}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      <span>{label}</span>
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
      )}
    </button>
  );
}

/* ─── Field wrapper với error message inline ──────────────────────────── */
function Field({ label, required, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-label-default text-label-default text-on-surface font-body-sm-medium flex items-center justify-between">
        <span>
          {label} {required && <span className="text-error font-bold">*</span>}
        </span>
      </label>
      {children}
      {error && (
        <span className="text-error font-label-sm text-label-sm flex items-center gap-1 animate-fadeIn">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {error}
        </span>
      )}
    </div>
  );
}

const inputCls =
  "w-full h-9 px-3 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm focus:bg-surface-container-lowest transition-colors border";

/**
 * WarehouseModal – Modal thêm mới / chỉnh sửa chi nhánh kho.
 * Hỗ trợ Sprint3-14 (API integration) & Sprint3-15 (validation & error handling).
 */
export default function WarehouseModal({
  mode,
  data,
  form,
  setForm,
  activeTab,
  setActiveTab,
  onSave,
  onClose,
  errors = {},
  isSaving = false,
}) {
  const isEdit = mode === "edit";
  const [localTab, setLocalTab] = useState(activeTab || "general");

  const switchTab = (id) => {
    setLocalTab(id);
    setActiveTab(id);
  };

  const handleField = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const TABS = [
    { id: "general", icon: "info", label: "Thông tin chung" },
    { id: "capacity", icon: "aspect_ratio", label: "Thông số & Diện tích" },
    { id: "contact", icon: "contacts", label: "Liên hệ & Quản lý" },
    { id: "operation", icon: "settings_suggest", label: "Cấu hình vận hành" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-warehouse-title"
    >
      <div className="w-full max-w-3xl bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* ── Modal Header ── */}
        <div className="px-space-xl py-space-md bg-surface-container-low flex items-center justify-between shrink-0">
          <div className="flex items-center gap-space-sm">
            <div className="w-9 h-9 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">warehouse</span>
            </div>
            <div className="flex flex-col">
              <h2 id="modal-warehouse-title" className="font-headline-sm text-headline-sm text-on-surface">
                {isEdit ? `Chỉnh sửa thông tin chi nhánh ${data?.code}` : "Thêm mới chi nhánh kho"}
              </h2>
              <span className="font-label-default text-label-default text-secondary">
                Hệ thống quản lý định danh thực thể kho bãi (WMS Entity)
              </span>
            </div>
          </div>
          <button
            className="p-1 text-secondary hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Đóng modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* ── Tab Bar ── */}
        <div className="px-space-xl bg-surface-container-lowest flex items-center gap-space-lg border-b border-outline-variant shrink-0">
          {TABS.map((t) => (
            <TabBtn key={t.id} {...t} active={localTab === t.id} onClick={switchTab} />
          ))}
        </div>

        {/* ── Form Body (scrollable) ── */}
        <div className="p-space-xl overflow-y-auto flex-1 flex flex-col gap-space-lg">

          {/* Banner lỗi chung nếu có (Sprint3-15 Error Handling) */}
          {errors.general && (
            <div className="p-3 rounded-lg bg-error-container text-on-error-container text-body-sm flex items-start gap-2 animate-fadeIn border border-error/20">
              <span className="material-symbols-outlined text-[20px] text-error shrink-0">error</span>
              <div className="flex-1">
                <span className="font-bold block">Không thể lưu thông tin</span>
                <span>{errors.general}</span>
              </div>
            </div>
          )}

          {/* TAB 1: Thông tin chung */}
          {localTab === "general" && (
            <div className="flex flex-col gap-space-md animate-slideUp">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <Field label="Mã chi nhánh kho" required error={errors.code}>
                  <div className="relative flex items-center">
                    <input
                      className={`${inputCls} ${errors.code ? "border-error focus:border-error" : "border-transparent"} font-code-mono text-code-mono font-bold text-primary uppercase`}
                      id="input-warehouse-code"
                      placeholder="VD: KHO-BTE01"
                      type="text"
                      value={form.code}
                      onChange={handleField("code")}
                      disabled={isEdit}
                    />
                    <span className="material-symbols-outlined absolute right-2.5 text-secondary text-[16px]">qr_code</span>
                  </div>
                  <span className="font-label-sm text-label-sm text-secondary">Mã định danh duy nhất (3–20 ký tự in hoa, số, gạch ngang)</span>
                </Field>

                <Field label="Tên chi nhánh kho" required error={errors.name}>
                  <input
                    className={`${inputCls} ${errors.name ? "border-error focus:border-error" : "border-transparent"}`}
                    id="input-warehouse-name"
                    placeholder="VD: Kho Trung chuyển Vĩnh Phúc"
                    type="text"
                    value={form.name}
                    onChange={handleField("name")}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <Field label="Phân loại mô hình kho" required>
                  <div className="relative flex items-center">
                    <select
                      className={`${inputCls} border-transparent appearance-none cursor-pointer`}
                      value={form.type}
                      onChange={handleField("type")}
                    >
                      <option value="standard">Kho tiêu chuẩn (Bách hóa tổng hợp)</option>
                      <option value="cold">Kho mát & Kho lạnh (-18°C ~ +4°C)</option>
                      <option value="crossdock">Kho Trung chuyển nhanh (Cross-dock)</option>
                      <option value="fulfillment">Kho Thương mại điện tử (E-Commerce Fulfillment)</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-2 pointer-events-none text-secondary text-[18px]">expand_more</span>
                  </div>
                </Field>

                <Field label="Khu vực vùng miền" required>
                  <div className="relative flex items-center">
                    <select
                      className={`${inputCls} border-transparent appearance-none cursor-pointer`}
                      value={form.region}
                      onChange={handleField("region")}
                    >
                      <option value="north">Miền Bắc</option>
                      <option value="central">Miền Trung</option>
                      <option value="south">Miền Nam</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-2 pointer-events-none text-secondary text-[18px]">expand_more</span>
                  </div>
                </Field>
              </div>

              <Field label="Địa chỉ chi tiết cơ sở" required error={errors.address}>
                <input
                  className={`${inputCls} ${errors.address ? "border-error focus:border-error" : "border-transparent"}`}
                  id="input-warehouse-address"
                  placeholder="Số nhà, đường, Khu công nghiệp, Quận/Huyện, Tỉnh..."
                  type="text"
                  value={form.address}
                  onChange={handleField("address")}
                />
              </Field>

              <Field label="Mô tả đặc điểm & Ghi chú">
                <textarea
                  className="w-full p-2.5 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm focus:bg-surface-container-lowest transition-colors resize-none border border-transparent"
                  placeholder="Ghi chú về phân luồng xe tải, hạn chế giờ cấm tải..."
                  rows={2}
                  value={form.notes}
                  onChange={handleField("notes")}
                />
              </Field>
            </div>
          )}

          {/* TAB 2: Thông số & Diện tích */}
          {localTab === "capacity" && (
            <div className="flex flex-col gap-space-md animate-slideUp">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <Field label="Tổng diện tích mặt sàn (m²)">
                  <input className={`${inputCls} border-transparent`} type="number" value={form.area} onChange={handleField("area")} placeholder="VD: 8500" />
                </Field>
                <Field label="Sức chứa thiết kế (Pallet tối đa)">
                  <input className={`${inputCls} border-transparent`} type="number" value={form.capacity} onChange={handleField("capacity")} placeholder="VD: 7000" />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                <Field label="Chiều cao tĩnh trần kho (m)">
                  <input className={`${inputCls} border-transparent`} step="0.5" type="number" value={form.height} onChange={handleField("height")} placeholder="VD: 12.5" />
                </Field>
                <Field label="Số cửa xuất / nhập hàng (Dock)">
                  <input className={`${inputCls} border-transparent`} type="number" value={form.docks} onChange={handleField("docks")} placeholder="VD: 14" />
                </Field>
                <Field label="Tải trọng sàn cho phép (Tấn/m²)">
                  <input className={`${inputCls} border-transparent`} step="0.5" type="number" value={form.floorLoad} onChange={handleField("floorLoad")} placeholder="VD: 5.0" />
                </Field>
              </div>
              <div className="p-space-md bg-surface-container-low rounded-lg flex items-center gap-space-md">
                <span className="material-symbols-outlined text-primary text-[28px]">forklift</span>
                <div className="flex flex-col text-on-surface">
                  <span className="font-body-sm-medium text-body-sm-medium">Khả năng tiếp nhận xe Container 40ft / 45ft</span>
                  <span className="font-label-sm text-label-sm text-secondary">Bãi quay đầu xe rộng 38m, sàn nâng thủy lực tự động (Dock Leveler)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Liên hệ & Quản lý */}
          {localTab === "contact" && (
            <div className="flex flex-col gap-space-md animate-slideUp">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <Field label="Giám đốc / Trưởng kho phụ trách">
                  <input className={`${inputCls} border-transparent`} placeholder="Họ và tên người quản lý" type="text" value={form.manager} onChange={handleField("manager")} />
                </Field>
                <Field label="Số điện thoại liên hệ" error={errors.phone}>
                  <input
                    className={`${inputCls} ${errors.phone ? "border-error focus:border-error" : "border-transparent"}`}
                    placeholder="09xx.xxx.xxx"
                    type="tel"
                    value={form.phone}
                    onChange={handleField("phone")}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <Field label="Hòm thư điện tử điều hành (Email)">
                  <input className={`${inputCls} border-transparent`} placeholder="kho.abc@logicore-wms.vn" type="email" value={form.email} onChange={handleField("email")} />
                </Field>
                <Field label="Bộ phận an ninh / PCCC Kho">
                  <input className={`${inputCls} border-transparent`} placeholder="Đội trưởng đội bảo vệ cơ sở" type="text" value={form.security} onChange={handleField("security")} />
                </Field>
              </div>
            </div>
          )}

          {/* TAB 4: Cấu hình vận hành */}
          {localTab === "operation" && (
            <div className="flex flex-col gap-space-md animate-slideUp">
              {/* Toggle: kích hoạt kho */}
              <div className="p-space-md bg-surface-container-low rounded-lg flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-body-sm-medium text-body-sm-medium text-on-surface">Kích hoạt kho ngay lập tức</span>
                  <span className="font-label-sm text-label-sm text-secondary">Cho phép điều phối đơn hàng và tiếp nhận Pallet vào hệ thống</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input className="sr-only peer" type="checkbox" checked={form.isActive} onChange={handleField("isActive")} />
                  <div className="w-11 h-6 bg-surface-container-high rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container" />
                </label>
              </div>

              {/* Toggle: barcode */}
              <div className="p-space-md bg-surface-container-low rounded-lg flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-body-sm-medium text-body-sm-medium text-on-surface">Bật chế độ quét mã Barcode / RFID đa tầng</span>
                  <span className="font-label-sm text-label-sm text-secondary">Bắt buộc nhân viên quét mã vị trí kệ trước khi hoàn tất xếp dỡ</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input className="sr-only peer" type="checkbox" checked={form.barcodeEnabled} onChange={handleField("barcodeEnabled")} />
                  <div className="w-11 h-6 bg-surface-container-high rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container" />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div className="px-space-xl py-space-md bg-surface-container-low flex items-center justify-between shrink-0">
          <span className="font-label-sm text-label-sm text-secondary">Vui lòng kiểm tra kỹ mã kho trước khi lưu cấu hình</span>
          <div className="flex items-center gap-space-sm">
            <button
              type="button"
              className="px-4 py-2 bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-surface-container-high transition-colors"
              onClick={onClose}
              disabled={isSaving}
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-primary-container text-on-primary-container font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  <span>{isEdit ? "Lưu thay đổi" : "Lưu & Tạo chi nhánh"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
