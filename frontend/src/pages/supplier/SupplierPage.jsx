import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supplierApi } from '../../api/supplierApi';
import { ApiClientError } from '../../api/ApiClientError';
import ToastNotification from '../../components/common/ToastNotification';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const INITIAL_SUPPLIERS = [
  { id: 1, code: 'SUP-SAMS01', name: 'Samsung Electronics VN', contactName: 'Kim Jin', email: 'contact@samsung.vn', phone: '028.1234.567', leadTimeDays: 5, reliabilityScore: 0.98, status: 'ACTIVE' },
  { id: 2, code: 'SUP-DELL01', name: 'Dell Technologies VN', contactName: 'John Doe', email: 'sales@dell.com.vn', phone: '028.3822.1133', leadTimeDays: 7, reliabilityScore: 0.95, status: 'ACTIVE' },
  { id: 3, code: 'SUP-LG01', name: 'LG Innotek Hải Phòng', contactName: 'Park Sung', email: 'contact@lginnotek.vn', phone: '0225.889.922', leadTimeDays: 10, reliabilityScore: 0.92, status: 'ACTIVE' },
  { id: 4, code: 'SUP-RANGDONG', name: 'Công ty CP Bóng đèn Rạng Đông', contactName: 'Nguyễn Văn Minh', email: 'banhang@rangdong.com.vn', phone: '024.3858.4310', leadTimeDays: 3, reliabilityScore: 0.96, status: 'INACTIVE' },
];

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState(INITIAL_SUPPLIERS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCodes, setSelectedCodes] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, mode: 'add', data: null });
  const [form, setForm] = useState({
    code: '',
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    leadTimeDays: 7,
    reliabilityScore: 0.95,
    status: 'ACTIVE',
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, text: '', icon: 'check_circle' });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, code: '' });

  const showToast = useCallback((text, icon = 'check_circle') => {
    setToast({ visible: true, text, icon });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2800);
  }, []);

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await supplierApi.getAll();
      if (Array.isArray(data) && data.length > 0) {
        setSuppliers(data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      s.code.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.contactName && s.contactName.toLowerCase().includes(q));
    const matchStatus = filterStatus === 'all' || s.status.toLowerCase() === filterStatus.toLowerCase();
    return matchSearch && matchStatus;
  });

  const isAllSelected = filtered.length > 0 && selectedCodes.size === filtered.length;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCodes(new Set(filtered.map((s) => s.code)));
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
    setForm({
      code: `SUP-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      leadTimeDays: 7,
      reliabilityScore: 0.95,
      status: 'ACTIVE',
    });
    setErrors({});
    setModal({ open: true, mode: 'add', data: null });
  };

  const openEditModal = (sup) => {
    setForm({
      code: sup.code,
      name: sup.name,
      contactName: sup.contactName || '',
      email: sup.email || '',
      phone: sup.phone || '',
      address: sup.address || '',
      leadTimeDays: sup.leadTimeDays || 7,
      reliabilityScore: sup.reliabilityScore || 0.95,
      status: sup.status || 'ACTIVE',
    });
    setErrors({});
    setModal({ open: true, mode: 'edit', data: sup });
  };

  const closeModal = () => {
    setModal({ open: false, mode: 'add', data: null });
    setErrors({});
  };

  const handleSave = async () => {
    const errs = {};
    if (!form.code.trim()) errs.code = 'Mã nhà cung cấp không được để trống';
    if (!form.name.trim()) errs.name = 'Tên nhà cung cấp không được để trống';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Email không hợp lệ';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSaving(true);
    setErrors({});

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      contactName: form.contactName ? form.contactName.trim() : null,
      email: form.email ? form.email.trim() : null,
      phone: form.phone ? form.phone.trim() : null,
      address: form.address ? form.address.trim() : null,
      leadTimeDays: Number(form.leadTimeDays) || 7,
      reliabilityScore: Number(form.reliabilityScore) || 0.95,
      status: form.status,
    };

    try {
      if (modal.mode === 'add') {
        const created = await supplierApi.create(payload);
        setSuppliers((prev) => [created || { ...payload, id: Date.now() }, ...prev]);
        showToast(`Đã thêm nhà cung cấp ${payload.code}!`, 'check_circle');
      } else {
        if (modal.data?.id) {
          await supplierApi.update(modal.data.id, payload);
        }
        setSuppliers((prev) =>
          prev.map((s) => (s.code === modal.data.code ? { ...s, ...payload } : s))
        );
        showToast(`Đã cập nhật nhà cung cấp ${payload.code}!`, 'check_circle');
      }
      closeModal();
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        setErrors({ code: 'Mã nhà cung cấp đã tồn tại' });
      } else {
        if (modal.mode === 'add') {
          setSuppliers((prev) => [{ ...payload, id: Date.now() }, ...prev]);
          showToast(`Đã lưu cục bộ nhà cung cấp ${payload.code}`, 'check_circle');
          closeModal();
        } else {
          setErrors({ general: err.message || 'Lỗi khi lưu nhà cung cấp' });
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const triggerDelete = (sup) => {
    setDeleteConfirm({ open: true, id: sup.id, code: sup.code });
  };

  const confirmDelete = async () => {
    const { id, code } = deleteConfirm;
    try {
      if (id) await supplierApi.delete(id);
      setSuppliers((prev) => prev.filter((s) => s.code !== code));
      setSelectedCodes((prev) => {
        const next = new Set(prev);
        next.delete(code);
        return next;
      });
      showToast(`Đã xóa nhà cung cấp ${code}`, 'delete');
    } catch (err) {
      showToast(err.message || 'Lỗi khi xóa nhà cung cấp', 'error');
    } finally {
      setDeleteConfirm({ open: false, id: null, code: '' });
    }
  };

  // KPI Calculations
  const totalSuppliers = suppliers.length;
  const activeCount = suppliers.filter((s) => s.status === 'ACTIVE').length;
  const highTrustCount = suppliers.filter((s) => Number(s.reliabilityScore) >= 0.95).length;
  const avgLeadTime = (
    suppliers.reduce((s, item) => s + (Number(item.leadTimeDays) || 0), 0) / (totalSuppliers || 1)
  ).toFixed(1);

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
            <span className="text-on-surface font-body-sm-medium">Nhà cung cấp đối tác</span>
          </nav>

          <div className="flex items-center gap-space-sm mt-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              Danh sách Nhà cung cấp
            </h1>
            <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container text-primary font-body-sm-medium">
              {suppliers.length} đối tác
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
            id="btn-refresh-suppliers"
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-surface-container-high transition-colors"
            onClick={async () => {
              await fetchSuppliers();
              showToast('Đã làm mới dữ liệu nhà cung cấp', 'sync');
            }}
          >
            <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}>sync</span>
            <span>{isLoading ? 'Đang tải...' : 'Làm mới dữ liệu'}</span>
          </button>
          <button
            id="btn-export-suppliers"
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-surface-container-high transition-colors"
            onClick={() => showToast('Đang xuất danh sách nhà cung cấp Excel...', 'file_download')}
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Xuất file Excel</span>
          </button>
          <button
            id="btn-add-supplier"
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-container text-on-primary-container font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-primary hover:text-on-primary transition-colors shadow-sm"
            onClick={openAddModal}
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Thêm mới nhà cung cấp</span>
          </button>
        </div>
      </div>

      {/* ── Main content body ── */}
      <div className="w-full px-margin py-space-lg flex flex-col gap-space-lg">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {/* Card 1 */}
          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-primary-container/10 group-hover:scale-125 transition-transform flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[28px]">local_shipping</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-default text-label-default text-secondary uppercase tracking-wider">
                Tổng số đối tác cung ứng
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-display text-on-surface font-bold">{totalSuppliers}</span>
                <span className="font-label-default text-label-default text-secondary">nhà cung cấp</span>
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-label-sm font-label-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg">
              <span className="text-secondary">Hoạt động</span>
              <span className="font-body-sm-medium text-primary">{activeCount} đối tác mở kho</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-tertiary-container/20 group-hover:scale-125 transition-transform flex items-center justify-center">
              <span className="material-symbols-outlined text-tertiary text-[28px]">verified</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-default text-label-default text-secondary uppercase tracking-wider">
                Độ tin cậy cam kết cao (≥95%)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-display text-on-surface font-bold">{highTrustCount}</span>
                <span className="font-label-default text-label-default text-secondary">đối tác hạng A</span>
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-label-sm font-label-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg">
              <span className="text-secondary">Tiêu chuẩn</span>
              <span className="font-body-sm-medium text-tertiary">Đúng hạn SLA</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-secondary-container/20 group-hover:scale-125 transition-transform flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-[28px]">schedule</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-default text-label-default text-secondary uppercase tracking-wider">
                Lead Time Giao Hàng TB
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-display text-on-surface font-bold">{avgLeadTime}</span>
                <span className="font-label-default text-label-default text-secondary">ngày nhập kho</span>
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-label-sm font-label-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg">
              <span className="text-secondary">Thời gian xử lý</span>
              <span className="font-body-sm-medium text-secondary">Tối ưu chuỗi cung ứng</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-error-container/20 group-hover:scale-125 transition-transform flex items-center justify-center">
              <span className="material-symbols-outlined text-error text-[28px]">pause_circle</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-default text-label-default text-secondary uppercase tracking-wider">
                Tạm ngưng nhập hàng
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-display text-on-surface font-bold">{totalSuppliers - activeCount}</span>
                <span className="font-label-default text-label-default text-secondary">đối tác tạm dừng</span>
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-label-sm font-label-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg">
              <span className="text-secondary">Chờ đánh giá lại</span>
              <span className="font-body-sm-medium text-error">Audit chất lượng</span>
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
              placeholder="Tìm kiếm theo mã, tên NCC, người liên hệ, email..."
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

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 px-3 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm text-on-surface cursor-pointer border border-transparent focus:border-primary/30"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động (ACTIVE)</option>
              <option value="inactive">Tạm ngưng (INACTIVE)</option>
            </select>

            {(search || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilterStatus('all');
                }}
                className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-secondary text-body-sm transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
                <span>Đặt lại</span>
              </button>
            )}
          </div>
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
                  <th className="py-3 px-4 min-w-[130px]">Mã NCC</th>
                  <th className="py-3 px-4 min-w-[200px]">Tên nhà cung cấp</th>
                  <th className="py-3 px-4 min-w-[160px]">Người đại diện</th>
                  <th className="py-3 px-4 min-w-[180px]">Liên hệ (Email/SĐT)</th>
                  <th className="py-3 px-4 min-w-[120px]">Giao hàng</th>
                  <th className="py-3 px-4 min-w-[120px]">Độ tin cậy</th>
                  <th className="py-3 px-4 min-w-[130px]">Trạng thái</th>
                  <th className="py-3 px-4 text-right min-w-[100px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm text-on-surface divide-y divide-outline-variant/30">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-secondary">
                      <div className="w-16 h-16 rounded-2xl bg-surface-container-low text-secondary mx-auto flex items-center justify-center mb-3">
                        <span className="material-symbols-outlined text-[32px] opacity-60">search_off</span>
                      </div>
                      <p className="font-body-sm-medium text-body-sm-medium text-on-surface">Không tìm thấy nhà cung cấp phù hợp</p>
                      <p className="text-secondary text-body-sm mt-1 max-w-sm mx-auto">
                        Thử điều chỉnh từ khóa tìm kiếm hoặc lọc theo trạng thái khác.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((sup) => {
                    const isChecked = selectedCodes.has(sup.code);
                    const isActive = sup.status === 'ACTIVE';
                    return (
                      <tr
                        key={sup.code}
                        className={`hover:bg-surface-container-low/40 transition-colors ${
                          isChecked ? 'bg-primary-container/10' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelect(sup.code)}
                            className="rounded border-outline text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-surface-container-high text-primary">
                              <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                            </span>
                            <span className="font-code-mono font-bold text-primary">{sup.code}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-body-sm-medium text-on-surface">{sup.name}</td>
                        <td className="py-3 px-4 text-secondary">{sup.contactName || '---'}</td>
                        <td className="py-3 px-4 text-secondary">
                          <div className="flex flex-col">
                            <span>{sup.email || '---'}</span>
                            <span className="text-[12px] text-outline font-code-mono">{sup.phone || ''}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-code-mono text-[13px]">{sup.leadTimeDays || 7} ngày</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${(sup.reliabilityScore || 0.95) * 100}%` }}
                              />
                            </div>
                            <span className="font-code-mono text-[12px] font-bold text-primary">
                              {((sup.reliabilityScore || 0.95) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-bold border ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive ? 'bg-emerald-600' : 'bg-slate-500'
                              }`}
                            />
                            {isActive ? 'Hoạt động' : 'Tạm dừng'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1 justify-end">
                            <button
                              onClick={() => openEditModal(sup)}
                              title="Chỉnh sửa nhà cung cấp"
                              className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-container-high transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              onClick={() => triggerDelete(sup)}
                              title="Xóa nhà cung cấp"
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
            <span>Hiển thị <strong>{filtered.length}</strong> / <strong>{suppliers.length}</strong> đối tác</span>
            <div className="flex items-center gap-1">
              <span className="text-outline">Cơ chế quản lý nhà cung cấp chuẩn ISO 9001</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Thêm / Sửa Nhà cung cấp */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-space-lg border-b border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-primary-container text-primary">
                  <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  {modal.mode === 'add' ? 'Thêm mới nhà cung cấp' : `Chỉnh sửa: ${modal.data?.code}`}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-space-lg flex flex-col gap-4 overflow-y-auto">
              {errors.general && (
                <div className="p-3 rounded-lg bg-error-container text-error text-body-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{errors.general}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-label-default text-on-surface font-body-sm-medium">
                    Mã NCC <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    disabled={modal.mode === 'edit'}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="VD: SUP-VINAS01"
                    className={`w-full h-10 px-3 bg-surface-container-low rounded-lg outline-none font-code-mono text-body-sm border ${
                      errors.code ? 'border-error' : 'border-outline-variant/50 focus:border-primary'
                    } ${modal.mode === 'edit' ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                  {errors.code && <span className="text-error text-[12px]">{errors.code}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-default text-on-surface font-body-sm-medium">
                    Tên nhà cung cấp <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="VD: Tổng kho Vật tư Miền Nam"
                    className={`w-full h-10 px-3 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm border ${
                      errors.name ? 'border-error' : 'border-outline-variant/50 focus:border-primary'
                    }`}
                  />
                  {errors.name && <span className="text-error text-[12px]">{errors.name}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-label-default text-on-surface font-body-sm-medium">Người đại diện liên hệ</label>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full h-10 px-3 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm border border-outline-variant/50 focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-default text-on-surface font-body-sm-medium">Email liên hệ</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="VD: contact@ncc.vn"
                    className={`w-full h-10 px-3 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm border ${
                      errors.email ? 'border-error' : 'border-outline-variant/50 focus:border-primary'
                    }`}
                  />
                  {errors.email && <span className="text-error text-[12px]">{errors.email}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-label-default text-on-surface font-body-sm-medium">Số điện thoại</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="VD: 028.1234.567"
                    className="w-full h-10 px-3 bg-surface-container-low rounded-lg outline-none font-code-mono text-body-sm border border-outline-variant/50 focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-default text-on-surface font-body-sm-medium">Thời gian giao (ngày)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.leadTimeDays}
                    onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
                    className="w-full h-10 px-3 bg-surface-container-low rounded-lg outline-none font-code-mono text-body-sm border border-outline-variant/50 focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-default text-on-surface font-body-sm-medium">Trạng thái hợp tác</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full h-10 px-3 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm border border-outline-variant/50 focus:border-primary"
                  >
                    <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                    <option value="INACTIVE">Tạm ngưng (INACTIVE)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-default text-on-surface font-body-sm-medium">Địa chỉ trụ sở / Kho xuất phát</label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="VD: Lô E2, Khu Công Nghệ Cao, TP. Thủ Đức, TP.HCM"
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
                <span>{modal.mode === 'add' ? 'Lưu nhà cung cấp mới' : 'Cập nhật thay đổi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Xác nhận Xóa */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        title="Xác nhận xóa nhà cung cấp"
        message={`Bạn có chắc chắn muốn xóa nhà cung cấp đối tác ${deleteConfirm.code}? Các đơn nhập kho liên quan có thể bị ảnh hưởng.`}
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
