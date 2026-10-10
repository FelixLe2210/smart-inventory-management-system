import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../../api/productApi';
import { categoryApi } from '../../api/categoryApi';
import { supplierApi } from '../../api/supplierApi';
import { ApiClientError } from '../../api/ApiClientError';
import ToastNotification from '../../components/common/ToastNotification';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export default function ProductPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedSkus, setSelectedSkus] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const [modal, setModal] = useState({ open: false, mode: 'add', data: null });
  const [form, setForm] = useState({
    sku: '',
    barcode: '',
    name: '',
    description: '',
    categoryId: '',
    supplierId: '',
    unit: 'Chiếc',
    purchasePrice: '',
    sellingPrice: '',
    minStockLevel: 5,
    maxStockLevel: 200,
    status: 'ACTIVE',
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, text: '', icon: 'check_circle' });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, sku: '' });

  const showToast = useCallback((text, icon = 'check_circle') => {
    setToast({ visible: true, text, icon });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2800);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prods, cats, sups] = await Promise.allSettled([
        productApi.getAll(),
        categoryApi.getAll(),
        supplierApi.getAll(),
      ]);

      const failures = [];
      if (prods.status === 'fulfilled' && Array.isArray(prods.value)) {
        setProducts(prods.value);
      } else {
        failures.push(`sản phẩm: ${prods.reason?.message || 'phản hồi không hợp lệ'}`);
      }
      if (cats.status === 'fulfilled' && Array.isArray(cats.value)) {
        setCategories(cats.value);
      } else {
        failures.push(`danh mục: ${cats.reason?.message || 'phản hồi không hợp lệ'}`);
      }
      if (sups.status === 'fulfilled' && Array.isArray(sups.value)) {
        setSuppliers(sups.value);
      } else {
        failures.push(`nhà cung cấp: ${sups.reason?.message || 'phản hồi không hợp lệ'}`);
      }
      if (failures.length > 0) {
        showToast(`Không thể tải ${failures.join('; ')}`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.sku.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.includes(q));
    const matchCategory = filterCategory === 'all' || p.categoryName === filterCategory;
    const matchStatus = filterStatus === 'all' || p.status.toLowerCase() === filterStatus.toLowerCase();
    return matchSearch && matchCategory && matchStatus;
  });

  const isAllSelected = filtered.length > 0 && selectedSkus.size === filtered.length;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedSkus(new Set(filtered.map((p) => p.sku)));
    } else {
      setSelectedSkus(new Set());
    }
  };

  const handleToggleSelect = (sku) => {
    setSelectedSkus((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  };

  const openAddModal = () => {
    setForm({
      sku: `PRD-${Math.floor(1000 + Math.random() * 9000)}`,
      barcode: `893${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      name: '',
      description: '',
      categoryId: categories[0]?.id || '',
      supplierId: suppliers[0]?.id || '',
      unit: 'Chiếc',
      purchasePrice: '',
      sellingPrice: '',
      minStockLevel: 5,
      maxStockLevel: 200,
      status: 'ACTIVE',
    });
    setErrors({});
    setModal({ open: true, mode: 'add', data: null });
  };

  const openEditModal = (p) => {
    setForm({
      sku: p.sku,
      barcode: p.barcode || '',
      name: p.name,
      description: p.description || '',
      categoryId: p.categoryId || '',
      supplierId: p.supplierId || '',
      unit: p.unit || 'Chiếc',
      purchasePrice: p.purchasePrice || '',
      sellingPrice: p.sellingPrice || '',
      minStockLevel: p.minStockLevel || 5,
      maxStockLevel: p.maxStockLevel || 200,
      status: p.status || 'ACTIVE',
    });
    setErrors({});
    setModal({ open: true, mode: 'edit', data: p });
  };

  const closeModal = () => {
    setModal({ open: false, mode: 'add', data: null });
    setErrors({});
  };

  const handleSave = async () => {
    const errs = {};
    if (!form.sku.trim()) errs.sku = 'SKU không được để trống';
    if (!form.name.trim()) errs.name = 'Tên sản phẩm không được để trống';
    if (!form.barcode.trim()) errs.barcode = 'Mã barcode không được để trống';
    if (!form.categoryId) errs.categoryId = 'Danh mục không được để trống';
    if (!form.purchasePrice) errs.purchasePrice = 'Giá nhập không được để trống';
    if (!form.sellingPrice) errs.sellingPrice = 'Giá bán không được để trống';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSaving(true);
    setErrors({});

    const payload = {
      sku: form.sku.trim().toUpperCase(),
      barcode: form.barcode.trim(),
      name: form.name.trim(),
      description: form.description ? form.description.trim() : null,
      categoryId: Number(form.categoryId),
      supplierId: form.supplierId ? Number(form.supplierId) : null,
      unit: form.unit.trim(),
      purchasePrice: Number(form.purchasePrice),
      sellingPrice: Number(form.sellingPrice),
      minStockLevel: Number(form.minStockLevel) || 5,
      maxStockLevel: Number(form.maxStockLevel) || 200,
      status: form.status,
    };

    try {
      if (modal.mode === 'add') {
        const created = await productApi.create(payload);
        setProducts((prev) => [created, ...prev]);
        showToast(`Đã thêm sản phẩm ${payload.sku}!`, 'check_circle');
      } else {
        if (!modal.data?.id) {
          throw new Error('Không xác định được sản phẩm cần cập nhật.');
        }
        const updated = await productApi.update(modal.data.id, payload);
        setProducts((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
        showToast(`Đã cập nhật sản phẩm ${payload.sku}!`, 'check_circle');
      }
      closeModal();
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        setErrors({ sku: err.message || 'Mã SKU hoặc barcode đã tồn tại' });
      } else {
        setErrors({ general: err.message || 'Lỗi khi lưu sản phẩm' });
        showToast(err.message || 'Lỗi khi lưu sản phẩm', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const triggerDelete = (p) => {
    setDeleteConfirm({ open: true, id: p.id, sku: p.sku });
  };

  const confirmDelete = async () => {
    const { id, sku } = deleteConfirm;
    try {
      if (!id) throw new Error('Không xác định được sản phẩm cần xóa.');
      await productApi.delete(id);
      setProducts((prev) => prev.filter((p) => p.sku !== sku));
      setSelectedSkus((prev) => {
        const next = new Set(prev);
        next.delete(sku);
        return next;
      });
      showToast(`Đã xóa sản phẩm ${sku}`, 'delete');
    } catch (err) {
      showToast(err.message || 'Lỗi khi xóa sản phẩm', 'error');
    } finally {
      setDeleteConfirm({ open: false, id: null, sku: '' });
    }
  };

  // KPI Calculations
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.status === 'ACTIVE').length;
  const safeStockItems = products.filter((p) => (p.minStockLevel || 0) <= 5).length;
  const avgSellingPrice =
    products.reduce((s, p) => s + (Number(p.sellingPrice) || 0), 0) / (totalProducts || 1);

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
            <span className="text-on-surface font-body-sm-medium">Danh mục Sản phẩm (SKU)</span>
          </nav>

          <div className="flex items-center gap-space-sm mt-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              Danh mục Sản phẩm (SKU)
            </h1>
            <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container text-primary font-body-sm-medium">
              {products.length} mặt hàng
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
            id="btn-refresh-products"
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-surface-container-high transition-colors"
            onClick={async () => {
              await loadData();
              showToast('Đã làm mới danh mục sản phẩm', 'sync');
            }}
          >
            <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}>sync</span>
            <span>{isLoading ? 'Đang tải...' : 'Làm mới dữ liệu'}</span>
          </button>
          <button
            id="btn-add-product"
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-container text-on-primary-container font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-primary hover:text-on-primary transition-colors shadow-sm"
            onClick={openAddModal}
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Thêm mới sản phẩm</span>
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
              <span className="material-symbols-outlined text-primary text-[28px]">inventory_2</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-default text-label-default text-secondary uppercase tracking-wider">
                Tổng số SKU mặt hàng
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-display text-on-surface font-bold">{totalProducts}</span>
                <span className="font-label-default text-label-default text-secondary">mã sản phẩm</span>
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-label-sm font-label-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg">
              <span className="text-secondary">Đang kinh doanh</span>
              <span className="font-body-sm-medium text-primary">{activeProducts} SKU hoạt động</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-tertiary-container/20 group-hover:scale-125 transition-transform flex items-center justify-center">
              <span className="material-symbols-outlined text-tertiary text-[28px]">qr_code_scanner</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-default text-label-default text-secondary uppercase tracking-wider">
                Mã vạch chuẩn GS1 / EAN
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-display text-on-surface font-bold">100%</span>
                <span className="font-label-default text-label-default text-secondary">đã gán Barcode</span>
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-label-sm font-label-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg">
              <span className="text-secondary">Kiểm định quét</span>
              <span className="font-body-sm-medium text-tertiary">Sẵn sàng Scanner</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-secondary-container/20 group-hover:scale-125 transition-transform flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-[28px]">payments</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-default text-label-default text-secondary uppercase tracking-wider">
                Đơn giá niêm yết TB
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-display text-on-surface font-bold">
                  {(avgSellingPrice / 1000000).toFixed(1)}M
                </span>
                <span className="font-label-default text-label-default text-secondary">VNĐ / đơn vị</span>
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-label-sm font-label-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg">
              <span className="text-secondary">Tỷ suất biên TB</span>
              <span className="font-body-sm-medium text-secondary">~18.5% lợi nhuận gộp</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-primary-container/10 group-hover:scale-125 transition-transform flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[28px]">shelves</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-default text-label-default text-secondary uppercase tracking-wider">
                Tồn an toàn & Ngưỡng ROP
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-display text-on-surface font-bold">{safeStockItems}</span>
                <span className="font-label-default text-label-default text-secondary">mặt hàng Min ≤ 5</span>
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-label-sm font-label-sm bg-surface-container-low px-2.5 py-1.5 rounded-lg">
              <span className="text-secondary">Cảnh báo thiếu hụt</span>
              <span className="font-body-sm-medium text-primary">Tự động gợi ý PO</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar (Sprint3-12: Product Search & Filter UI) */}
        <div className="p-space-md bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/40 flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="relative flex items-center w-full lg:max-w-md">
            <span className="material-symbols-outlined absolute left-3 text-secondary text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo SKU, mã vạch (Barcode), tên sản phẩm..."
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

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Filter Category */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-9 px-3 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm text-on-surface cursor-pointer border border-transparent focus:border-primary/30"
            >
              <option value="all">Tất cả ngành hàng</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Filter Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 px-3 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm text-on-surface cursor-pointer border border-transparent focus:border-primary/30"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang kinh doanh (ACTIVE)</option>
              <option value="inactive">Tạm ngưng (INACTIVE)</option>
            </select>

            {(search || filterCategory !== 'all' || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilterCategory('all');
                  setFilterStatus('all');
                }}
                className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-secondary text-body-sm transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
                <span>Đặt lại</span>
              </button>
            )}

            {selectedSkus.size > 0 && (
              <div className="flex items-center gap-2 ml-auto px-3 py-1.5 rounded-lg bg-primary-container/20 text-on-primary-container font-body-sm-medium text-body-sm-medium">
                <span>Đã chọn {selectedSkus.size} SKU</span>
                <button
                  onClick={() => showToast(`Đang in nhãn mã vạch cho ${selectedSkus.size} SKU`, 'print')}
                  className="px-2 py-0.5 rounded bg-surface-container-lowest text-primary hover:bg-primary hover:text-on-primary transition-colors text-[12px] font-bold"
                >
                  In mã Barcode
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table Container (Sprint3-09: Product List UI) */}
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
                  <th className="py-3 px-4 min-w-[150px]">SKU & Mã Vạch</th>
                  <th className="py-3 px-4 min-w-[220px]">Tên mặt hàng & Đơn vị</th>
                  <th className="py-3 px-4 min-w-[180px]">Ngành hàng & Nhà cung ứng</th>
                  <th className="py-3 px-4 min-w-[140px]">Giá nhập kho</th>
                  <th className="py-3 px-4 min-w-[140px]">Giá bán lẻ</th>
                  <th className="py-3 px-4 min-w-[130px]">Ngưỡng Min - Max</th>
                  <th className="py-3 px-4 min-w-[120px]">Trạng thái</th>
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
                      <p className="font-body-sm-medium text-body-sm-medium text-on-surface">Không tìm thấy sản phẩm phù hợp</p>
                      <p className="text-secondary text-body-sm mt-1 max-w-sm mx-auto">
                        Thử xóa bộ lọc tìm kiếm hoặc thêm mới sản phẩm vào hệ thống Master Data.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((prod) => {
                    const isChecked = selectedSkus.has(prod.sku);
                    const isActive = prod.status === 'ACTIVE';
                    return (
                      <tr
                        key={prod.sku}
                        className={`hover:bg-surface-container-low/40 transition-colors ${
                          isChecked ? 'bg-primary-container/10' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelect(prod.sku)}
                            className="rounded border-outline text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-code-mono font-bold text-primary flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">qr_code</span>
                              {prod.sku}
                            </span>
                            <span className="font-code-mono text-[11px] text-secondary">
                              EAN: {prod.barcode || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-body-sm-medium text-on-surface">{prod.name}</span>
                            <span className="text-[12px] text-secondary">ĐVT: {prod.unit || 'Chiếc'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="text-on-surface">{prod.categoryName || 'Chung'}</span>
                            <span className="text-[12px] text-secondary">{prod.supplierName || '---'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-code-mono text-[13px] text-secondary">
                          {Number(prod.purchasePrice || 0).toLocaleString('vi-VN')} ₫
                        </td>
                        <td className="py-3 px-4 font-code-mono text-[13px] font-bold text-primary">
                          {Number(prod.sellingPrice || 0).toLocaleString('vi-VN')} ₫
                        </td>
                        <td className="py-3 px-4 font-code-mono text-[12px]">
                          <span className="text-secondary">{prod.minStockLevel || 5}</span>
                          <span className="text-outline mx-1">~</span>
                          <span className="text-on-surface font-medium">{prod.maxStockLevel || 200}</span>
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
                            {isActive ? 'Kinh doanh' : 'Tạm dừng'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1 justify-end">
                            <Link
                              to={`/inventory?productId=${prod.id}`}
                              title="Xem tồn kho của sản phẩm"
                              className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-container-high transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">shelves</span>
                            </Link>
                            <button
                              onClick={() => openEditModal(prod)}
                              title="Chỉnh sửa sản phẩm"
                              className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-container-high transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              onClick={() => triggerDelete(prod)}
                              title="Xóa sản phẩm"
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
            <span>Hiển thị <strong>{filtered.length}</strong> / <strong>{products.length}</strong> mặt hàng</span>
            <div className="flex items-center gap-1">
              <span className="text-outline">Hệ thống đồng bộ tồn kho thời gian thực</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Thêm / Sửa Sản phẩm */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-space-lg border-b border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-primary-container text-primary">
                  <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  {modal.mode === 'add' ? 'Thêm mới sản phẩm SKU' : `Chỉnh sửa: ${modal.data?.sku}`}
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

              {/* SKU & Barcode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-label-default text-on-surface font-body-sm-medium">
                    Mã SKU <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.sku}
                    disabled={modal.mode === 'edit'}
                    onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                    placeholder="VD: PRD-LAPTOP01"
                    className={`w-full h-10 px-3 bg-surface-container-low rounded-lg outline-none font-code-mono text-body-sm border ${
                      errors.sku ? 'border-error' : 'border-outline-variant/50 focus:border-primary'
                    } ${modal.mode === 'edit' ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                  {errors.sku && <span className="text-error text-[12px]">{errors.sku}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-default text-on-surface font-body-sm-medium">
                    Mã vạch Barcode (EAN-13) <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    placeholder="VD: 8938501234567"
                    className={`w-full h-10 px-3 bg-surface-container-low rounded-lg outline-none font-code-mono text-body-sm border ${
                      errors.barcode ? 'border-error' : 'border-outline-variant/50 focus:border-primary'
                    }`}
                  />
                  {errors.barcode && <span className="text-error text-[12px]">{errors.barcode}</span>}
                </div>
              </div>

              {/* Name & Unit */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 flex flex-col gap-1">
                  <label className="font-label-default text-on-surface font-body-sm-medium">
                    Tên sản phẩm đầy đủ <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="VD: Màn hình Dell UltraSharp 27 inch 4K"
                    className={`w-full h-10 px-3 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm border ${
                      errors.name ? 'border-error' : 'border-outline-variant/50 focus:border-primary'
                    }`}
                  />
                  {errors.name && <span className="text-error text-[12px]">{errors.name}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-default text-on-surface font-body-sm-medium">Đơn vị tính</label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    placeholder="Chiếc, Thùng, Hộp..."
                    className="w-full h-10 px-3 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm border border-outline-variant/50 focus:border-primary"
                  />
                </div>
              </div>

              {/* Category & Supplier */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-label-default text-on-surface font-body-sm-medium">Ngành hàng phân loại</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full h-10 px-3 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm border border-outline-variant/50 focus:border-primary"
                  >
                    {categories.length > 0 ? (
                      categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))
                    ) : (
                      <option value="1">Thiết bị điện tử & Viễn thông</option>
                    )}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-default text-on-surface font-body-sm-medium">Nhà cung ứng đối tác</label>
                  <select
                    value={form.supplierId}
                    onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                    className="w-full h-10 px-3 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm border border-outline-variant/50 focus:border-primary"
                  >
                    {suppliers.length > 0 ? (
                      suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))
                    ) : (
                      <option value="1">Samsung Electronics VN</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-label-default text-on-surface font-body-sm-medium">
                    Giá nhập kho (VNĐ) <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.purchasePrice}
                    onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                    placeholder="VD: 15000000"
                    className={`w-full h-10 px-3 bg-surface-container-low rounded-lg outline-none font-code-mono text-body-sm border ${
                      errors.purchasePrice ? 'border-error' : 'border-outline-variant/50 focus:border-primary'
                    }`}
                  />
                  {errors.purchasePrice && <span className="text-error text-[12px]">{errors.purchasePrice}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-default text-on-surface font-body-sm-medium">
                    Giá niêm yết bán lẻ (VNĐ) <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.sellingPrice}
                    onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                    placeholder="VD: 18500000"
                    className={`w-full h-10 px-3 bg-surface-container-low rounded-lg outline-none font-code-mono text-body-sm border ${
                      errors.sellingPrice ? 'border-error' : 'border-outline-variant/50 focus:border-primary'
                    }`}
                  />
                  {errors.sellingPrice && <span className="text-error text-[12px]">{errors.sellingPrice}</span>}
                </div>
              </div>

              {/* Min - Max stock & Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-label-default text-on-surface font-body-sm-medium">Tồn tối thiểu (Min)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.minStockLevel}
                    onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })}
                    className="w-full h-10 px-3 bg-surface-container-low rounded-lg outline-none font-code-mono text-body-sm border border-outline-variant/50 focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-default text-on-surface font-body-sm-medium">Tồn tối đa (Max)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.maxStockLevel}
                    onChange={(e) => setForm({ ...form, maxStockLevel: e.target.value })}
                    className="w-full h-10 px-3 bg-surface-container-low rounded-lg outline-none font-code-mono text-body-sm border border-outline-variant/50 focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-default text-on-surface font-body-sm-medium">Trạng thái mặt hàng</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full h-10 px-3 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm border border-outline-variant/50 focus:border-primary"
                  >
                    <option value="ACTIVE">Kinh doanh (ACTIVE)</option>
                    <option value="INACTIVE">Tạm dừng (INACTIVE)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="font-label-default text-on-surface font-body-sm-medium">Mô tả sản phẩm & Quy cách</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Thông số kỹ thuật, bảo hành, ghi chú đặc biệt..."
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
                <span>{modal.mode === 'add' ? 'Lưu sản phẩm mới' : 'Cập nhật thay đổi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Xác nhận Xóa */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        title="Xác nhận xóa mặt hàng"
        message={`Bạn có chắc chắn muốn xóa sản phẩm ${deleteConfirm.sku}? Các chứng từ kiểm kê và phiếu kho liên quan sẽ cần được cập nhật.`}
        confirmLabel="Xóa vĩnh viễn"
        cancelLabel="Hủy bỏ"
        confirmVariant="error"
        icon="delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: null, sku: '' })}
      />

      {/* Toast Notification */}
      <ToastNotification visible={toast.visible} text={toast.text} icon={toast.icon} />
    </div>
  );
}
