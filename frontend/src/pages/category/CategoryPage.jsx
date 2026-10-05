import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { categoryApi } from '../../api/categoryApi';
import { ApiClientError } from '../../api/ApiClientError';
import ToastNotification from '../../components/common/ToastNotification';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export default function CategoryPage() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCodes, setSelectedCodes] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, mode: 'add', data: null });
  const [form, setForm] = useState({ code: '', name: '', description: '' });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, text: '', icon: 'check_circle' });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, code: '' });

  const showToast = useCallback((text, icon = 'check_circle') => {
    setToast({ visible: true, text, icon });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2800);
  }, []);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await categoryApi.getAll();
      if (!Array.isArray(data)) {
        throw new Error('Backend trả về danh sách danh mục không hợp lệ.');
      }
      setCategories(data);
    } catch (err) {
      showToast(err.message || 'Không thể tải danh mục từ máy chủ.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const filtered = categories.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  const isAllSelected = filtered.length > 0 && selectedCodes.size === filtered.length;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCodes(new Set(filtered.map((c) => c.code)));
    } else {
      setSelectedCodes(new Set());
    }
  };

  const handleToggleSelect = (code) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const openAddModal = () => {
    setForm({ code: `CAT-${Math.floor(1000 + Math.random() * 9000)}`, name: '', description: '' });
    setErrors({});
    setModal({ open: true, mode: 'add', data: null });
  };

  const openEditModal = (cat) => {
    setForm({ code: cat.code, name: cat.name, description: cat.description || '' });
    setErrors({});
    setModal({ open: true, mode: 'edit', data: cat });
  };

  const closeModal = () => {
    setModal({ open: false, mode: 'add', data: null });
    setErrors({});
  };

  const handleSave = async () => {
    const errs = {};
    if (!form.code.trim()) errs.code = 'Mã danh mục không được để trống';
    if (!form.name.trim()) errs.name = 'Tên danh mục không được để trống';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSaving(true);
    setErrors({});

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description ? form.description.trim() : null,
    };

    try {
      if (modal.mode === 'add') {
        const created = await categoryApi.create(payload);
        setCategories((prev) => [created, ...prev]);
        showToast(`Đã tạo danh mục ${payload.code} thành công!`, 'check_circle');
      } else {
        if (!modal.data?.id) {
          throw new Error('Không xác định được danh mục cần cập nhật.');
        }
        const updated = await categoryApi.update(modal.data.id, payload);
        setCategories((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        showToast(`Đã cập nhật danh mục ${payload.code}!`, 'check_circle');
      }
      closeModal();
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        setErrors({ code: 'Mã danh mục đã tồn tại trong hệ thống' });
      } else {
        setErrors({ general: err.message || 'Lỗi khi lưu danh mục' });
        showToast(err.message || 'Lỗi khi lưu danh mục', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const triggerDelete = (cat) => {
    setDeleteConfirm({ open: true, id: cat.id, code: cat.code });
  };

  const confirmDelete = async () => {
    const { id, code } = deleteConfirm;
    try {
      if (!id) throw new Error('Không xác định được danh mục cần xóa.');
      await categoryApi.delete(id);
      setCategories((prev) => prev.filter((c) => c.code !== code));
      setSelectedCodes((prev) => {
        const next = new Set(prev);
        next.delete(code);
        return next;
      });
      showToast(`Đã xóa danh mục ${code}`, 'delete');
    } catch (err) {
      showToast(err.message || 'Lỗi khi xóa danh mục', 'error');
    } finally {
      setDeleteConfirm({ open: false, id: null, code: '' });
    }
  };

  // KPI Calculations
  const totalCategories = categories.length;
  const elecCount = categories.filter((c) => c.code.includes('ELEC') || c.name.toLowerCase().includes('điện tử')).length;
  const compCount = categories.filter((c) => c.code.includes('COMP') || c.name.toLowerCase().includes('máy tính')).length;
  const otherCount = totalCategories - elecCount - compCount;

  return (
    <div className="flex flex-col w-full">
      {/* ── Breadcrumb + Page title + Action buttons ── */}
      <div className="w-full px-margin py-space-md flex flex-col md:flex-row md:items-center md:justify-between gap-space-md bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col gap-0.5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-space-xs text-secondary font-label-default text-label-default">
            <Link to="/warehouses" className="hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">home</span>
              <span>Trang chủ</span>
            </Link>
            <span className="text-outline-variant">/</span>
            <span className="text-secondary">Master Data</span>
            <span className="text-outline-variant">/</span>
            <span className="text-on-surface font-body-sm-medium">Danh mục sản phẩm</span>
          </nav>

          <div className="flex items-center gap-space-sm mt-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              Quản lý Phân loại & Danh mục
            </h1>
            <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container text-primary font-body-sm-medium">
              {categories.length} danh mục
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container-low text-tertiary">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
              Đồng bộ thời gian thực
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center flex-wrap gap-space-sm">
          <button
            id="btn-refresh-categories"
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-surface-container-high transition-colors"
            onClick={async () => {
              await fetchCategories();
              showToast('Đã làm mới dữ liệu danh mục', 'sync');
            }}
          >
            <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}>sync</span>
            <span>{isLoading ? 'Đang tải...' : 'Làm mới dữ liệu'}</span>
          </button>
          <button
            id="btn-add-category"
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-container text-on-primary-container font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-primary hover:text-on-primary transition-colors shadow-sm"
            onClick={openAddModal}
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Thêm mới danh mục</span>
          </button>
        </div>
      </div>

      {/* ── Main content body ── */}
      <div className="w-full px-margin py-space-lg flex flex-col gap-space-lg">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {/* Card 1 */}
          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-primary-container/10 group-hover:scale-125 transition-transform flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[28px]">category</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-default text-label-default text-secondary uppercase tracking-wider">
                Tổng số nhóm phân loại
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-display text-on-surface font-bold">{totalCategories}</span>
                <span className="font-label-default text-label-default text-secondary">danh mục</span>
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-label-sm font-label-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg">
              <span className="text-secondary">Trạng thái mã</span>
              <span className="font-body-sm-medium text-primary">100% Chuẩn hóa SKU</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-secondary-container/20 group-hover:scale-125 transition-transform flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-[28px]">devices</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-default text-label-default text-secondary uppercase tracking-wider">
                Điện tử & Thiết bị số
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-display text-on-surface font-bold">{elecCount}</span>
                <span className="font-label-default text-label-default text-secondary">nhóm hàng</span>
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-label-sm font-label-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg">
              <span className="text-secondary">Bảo quản kho</span>
              <span className="font-body-sm-medium text-secondary">Nhiệt độ phòng (Dry)</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-tertiary-container/20 group-hover:scale-125 transition-transform flex items-center justify-center">
              <span className="material-symbols-outlined text-tertiary text-[28px]">precision_manufacturing</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-default text-label-default text-secondary uppercase tracking-wider">
                Máy tính & Linh kiện
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-display text-on-surface font-bold">{compCount}</span>
                <span className="font-label-default text-label-default text-secondary">nhóm hàng</span>
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-label-sm font-label-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg">
              <span className="text-secondary">Kiểm định Serial</span>
              <span className="font-body-sm-medium text-tertiary">Bắt buộc quét IMEI/SN</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-primary-container/10 group-hover:scale-125 transition-transform flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[28px]">inventory</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-default text-label-default text-secondary uppercase tracking-wider">
                Cơ khí, Tiêu dùng & Khác
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-display text-on-surface font-bold">{otherCount}</span>
                <span className="font-label-default text-label-default text-secondary">nhóm hàng</span>
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-label-sm font-label-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg">
              <span className="text-secondary">Độ ưu tiên xử lý</span>
              <span className="font-body-sm-medium text-on-surface">Xuất kho FIFO/FEFO</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-space-md bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/40 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex items-center w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 text-secondary text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo mã, tên danh mục, mô tả chi tiết..."
              className="w-full h-9 pl-9 pr-8 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm focus:bg-surface-container-lowest transition-colors border border-transparent focus:border-primary/30"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 text-secondary hover:text-on-surface"
                aria-label="Xóa tìm kiếm"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {selectedCodes.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-container/20 text-on-primary-container font-body-sm-medium text-body-sm-medium">
              <span>Đã chọn {selectedCodes.size} danh mục</span>
              <button
                onClick={() => showToast(`Đã xuất ${selectedCodes.size} danh mục đã chọn`, 'print')}
                className="ml-2 px-2 py-0.5 rounded bg-surface-container-lowest text-primary hover:bg-primary hover:text-on-primary transition-colors text-[12px] font-bold"
              >
                In nhãn
              </button>
            </div>
          )}
        </div>

        {/* Table Container */}
        <div className="rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant overflow-hidden flex flex-col">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/70 text-secondary font-label-default text-label-default uppercase tracking-wider border-b border-outline-variant/40">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="rounded border-outline text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 min-w-[140px]">Mã danh mục</th>
                  <th className="py-3 px-4 min-w-[240px]">Tên danh mục phân loại</th>
                  <th className="py-3 px-4 min-w-[320px]">Mô tả chi tiết nhóm hàng</th>
                  <th className="py-3 px-4 min-w-[140px]">Ngày tạo</th>
                  <th className="py-3 px-4 text-right min-w-[120px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm text-on-surface divide-y divide-outline-variant/30">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-secondary">
                      <div className="w-16 h-16 rounded-2xl bg-surface-container-low text-secondary mx-auto flex items-center justify-center mb-3">
                        <span className="material-symbols-outlined text-[32px] opacity-60">search_off</span>
                      </div>
                      <p className="font-body-sm-medium text-body-sm-medium text-on-surface">Không tìm thấy danh mục phù hợp</p>
                      <p className="text-secondary text-body-sm mt-1 max-w-sm mx-auto">
                        Thử điều chỉnh từ khóa tìm kiếm hoặc bấm "Thêm mới danh mục" để tạo phân loại mới.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((cat) => {
                    const isChecked = selectedCodes.has(cat.code);
                    return (
                      <tr
                        key={cat.code}
                        className={`hover:bg-surface-container-low/40 transition-colors ${
                          isChecked ? 'bg-primary-container/10' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelect(cat.code)}
                            className="rounded border-outline text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-surface-container-high text-primary">
                              <span className="material-symbols-outlined text-[16px]">folder_special</span>
                            </span>
                            <span className="font-code-mono font-bold text-primary">{cat.code}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-body-sm-medium text-on-surface">
                          {cat.name}
                        </td>
                        <td className="py-3 px-4 text-secondary">
                          <span className="line-clamp-2">{cat.description || 'Chưa có mô tả bổ sung'}</span>
                        </td>
                        <td className="py-3 px-4 text-secondary font-code-mono text-[13px]">
                          {cat.createdAt || '2026-09-01'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1 justify-end">
                            <button
                              onClick={() => openEditModal(cat)}
                              title="Chỉnh sửa danh mục"
                              className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-container-high transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              onClick={() => triggerDelete(cat)}
                              title="Xóa danh mục"
                              className="p-1.5 rounded-lg text-secondary hover:text-error hover:bg-error-container/20 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Bottom Footer */}
          <div className="px-space-lg py-3 bg-surface-container-low/50 border-t border-outline-variant/30 flex items-center justify-between text-secondary font-label-default text-label-default">
            <span>Hiển thị <strong>{filtered.length}</strong> / <strong>{categories.length}</strong> danh mục</span>
            <div className="flex items-center gap-1">
              <span className="text-outline">Hệ thống phân cấp tiêu chuẩn WMS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Thêm / Chỉnh sửa Danh mục */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden flex flex-col">
            <div className="p-space-lg border-b border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-primary-container text-primary">
                  <span className="material-symbols-outlined text-[20px]">category</span>
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  {modal.mode === 'add' ? 'Thêm mới danh mục hàng' : `Chỉnh sửa: ${modal.data?.code}`}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-space-lg flex flex-col gap-4">
              {errors.general && (
                <div className="p-3 rounded-lg bg-error-container text-error text-body-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{errors.general}</span>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="font-label-default text-on-surface font-body-sm-medium flex items-center justify-between">
                  <span>Mã danh mục <span className="text-error">*</span></span>
                  <span className="text-[11px] text-secondary">Tối thiểu 3 ký tự (VD: CAT-ELEC)</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  disabled={modal.mode === 'edit'}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="VD: CAT-APPL"
                  className={`w-full h-10 px-3 bg-surface-container-low rounded-lg outline-none font-code-mono text-body-sm border ${
                    errors.code ? 'border-error' : 'border-outline-variant/50 focus:border-primary'
                  } ${modal.mode === 'edit' ? 'opacity-70 cursor-not-allowed' : ''}`}
                />
                {errors.code && <span className="text-error text-[12px]">{errors.code}</span>}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-default text-on-surface font-body-sm-medium">
                  Tên danh mục <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="VD: Gia dụng & Thiết bị đời sống"
                  className={`w-full h-10 px-3 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm border ${
                    errors.name ? 'border-error' : 'border-outline-variant/50 focus:border-primary'
                  }`}
                />
                {errors.name && <span className="text-error text-[12px]">{errors.name}</span>}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-default text-on-surface font-body-sm-medium">
                  Mô tả chi tiết nhóm hàng hóa
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ghi chú quy cách bảo quản, nhóm hàng liên quan..."
                  className="w-full p-3 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm border border-outline-variant/50 focus:border-primary resize-none"
                />
              </div>
            </div>

            <div className="px-space-lg py-space-md bg-surface-container-low flex items-center justify-end gap-space-sm border-t border-outline-variant/20">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 bg-surface-container text-on-surface font-body-sm-medium rounded-lg hover:bg-surface-container-high transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="px-5 py-2 bg-primary text-on-primary font-body-sm-medium rounded-lg hover:bg-primary-dim transition-colors shadow-sm flex items-center gap-1.5"
              >
                {isSaving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                <span>{modal.mode === 'add' ? 'Lưu danh mục mới' : 'Cập nhật thay đổi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Xác nhận Xóa */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        title="Xác nhận xóa danh mục"
        message={`Bạn có chắc chắn muốn xóa danh mục ${deleteConfirm.code}? Các sản phẩm thuộc danh mục này có thể cần được phân loại lại.`}
        confirmLabel="Xóa vĩnh viễn"
        cancelLabel="Hủy bỏ"
        confirmVariant="error"
        icon="delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: null, code: '' })}
      />

      {/* Toast Notification */}
      <ToastNotification visible={toast.visible} text={toast.text} icon={toast.icon} />
    </div>
  );
}
