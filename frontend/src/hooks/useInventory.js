/**
 * useInventory – state, API calls & logic cho trang Tồn kho.
 * Sprint4-13 (Stock Status UI) + Sprint4-14 (Filtering) + Sprint4-15 (Integration với Master Data).
 *
 * - Backend lọc theo kho / sản phẩm (GET /api/inventories?warehouseId=&productId=).
 * - Lọc theo trạng thái tồn + tìm kiếm thực hiện ở frontend trên danh sách đã tải,
 *   KPI cũng tính từ danh sách theo phạm vi kho / sản phẩm đang chọn.
 * - Bộ lọc đồng bộ lên URL, ví dụ /inventory?warehouseId=3&status=LOW_STOCK,
 *   để trang Kho / Sản phẩm liên kết thẳng sang tồn kho.
 */
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { inventoryApi } from '../api/inventoryApi';
import { productApi } from '../api/productApi';
import { warehouseApi } from '../api/warehouseApi';
import { ApiClientError } from '../api/ApiClientError';
import { STOCK_STATUS_KEYS } from '../components/inventory/StockStatusBadge';
import { summarize, filterInventory, validateAdjustment } from '../utils/inventoryFilters';

const EMPTY_ADD = {
  productId: '',
  warehouseId: '',
  initialStock: '',
  reservedStock: 0,
  locationInWarehouse: '',
};
const EMPTY_ADJUST = { adjustmentType: 'IN', quantity: '', reason: '', referenceDoc: '' };

export function useInventory() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Bộ lọc (khởi tạo từ URL) ─────────────────────────────────────────
  const initialStatus = (searchParams.get('status') || '').toUpperCase();
  const [filterWarehouse, setFilterWarehouse] = useState(searchParams.get('warehouseId') || 'all');
  const [filterProduct, setFilterProduct] = useState(searchParams.get('productId') || 'all');
  const [filterStatus, setFilterStatus] = useState(
    STOCK_STATUS_KEYS.includes(initialStatus) ? initialStatus : 'all'
  );
  const [search, setSearch] = useState('');

  // ── Dữ liệu ──────────────────────────────────────────────────────────
  const [rows, setRows] = useState([]); // theo phạm vi kho / sản phẩm
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  // ── Modal / form ─────────────────────────────────────────────────────
  const [modal, setModal] = useState({ open: false, mode: 'add', data: null }); // add | adjust | location
  const [form, setForm] = useState(EMPTY_ADD);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // ── Toast ────────────────────────────────────────────────────────────
  const [toast, setToast] = useState({ visible: false, text: '', icon: 'check_circle' });
  const toastTimer = useRef(null);
  const showToast = useCallback((text, icon = 'check_circle') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, text, icon });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }, []);

  // Đồng bộ bộ lọc lên URL (chỉ ghi khi khác URL hiện tại để tránh vòng lặp render)
  const urlRef = useRef({ searchParams, setSearchParams });
  urlRef.current = { searchParams, setSearchParams };
  useEffect(() => {
    const next = new URLSearchParams();
    if (filterWarehouse !== 'all') next.set('warehouseId', filterWarehouse);
    if (filterProduct !== 'all') next.set('productId', filterProduct);
    if (filterStatus !== 'all') next.set('status', filterStatus);
    if (next.toString() !== urlRef.current.searchParams.toString()) {
      urlRef.current.setSearchParams(next, { replace: true });
    }
  }, [filterWarehouse, filterProduct, filterStatus]);

  // ── Nạp Master Data cho dropdown (1 lần) ─────────────────────────────
  useEffect(() => {
    (async () => {
      const [prods, whs] = await Promise.allSettled([productApi.getAll(), warehouseApi.getAll()]);
      if (prods.status === 'fulfilled' && Array.isArray(prods.value)) setProducts(prods.value);
      if (whs.status === 'fulfilled' && Array.isArray(whs.value)) setWarehouses(whs.value);
      if (prods.status === 'rejected' || whs.status === 'rejected') {
        showToast('Không thể tải danh sách sản phẩm / kho để lọc', 'error');
      }
    })();
  }, [showToast]);

  // ── Nạp tồn kho theo kho / sản phẩm (bỏ qua phản hồi cũ) ─────────────
  const requestId = useRef(0);
  const fetchInventory = useCallback(async () => {
    const current = ++requestId.current;
    setIsLoading(true);
    setLoadError('');
    try {
      const list = await inventoryApi.getAll({ warehouseId: filterWarehouse, productId: filterProduct });
      if (current !== requestId.current) return;
      if (!Array.isArray(list)) throw new Error('Backend trả về danh sách tồn kho không hợp lệ.');
      setRows(list);
    } catch (err) {
      if (current !== requestId.current) return;
      const msg = err.message || 'Không thể tải dữ liệu tồn kho.';
      setLoadError(msg);
      showToast(msg, 'error');
    } finally {
      if (current === requestId.current) setIsLoading(false);
    }
  }, [filterWarehouse, filterProduct, showToast]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // ── Dữ liệu hiển thị ─────────────────────────────────────────────────
  const summary = useMemo(() => summarize(rows), [rows]);
  const items = useMemo(() => filterInventory(rows, filterStatus, search), [rows, filterStatus, search]);

  const hasActiveFilter =
    filterWarehouse !== 'all' || filterProduct !== 'all' || filterStatus !== 'all' || !!search;

  const resetFilters = useCallback(() => {
    setFilterWarehouse('all');
    setFilterProduct('all');
    setFilterStatus('all');
    setSearch('');
  }, []);

  // ── Modal ────────────────────────────────────────────────────────────
  const openAddModal = useCallback(() => {
    setForm({
      ...EMPTY_ADD,
      productId: filterProduct !== 'all' ? filterProduct : '',
      warehouseId: filterWarehouse !== 'all' ? filterWarehouse : '',
    });
    setErrors({});
    setModal({ open: true, mode: 'add', data: null });
  }, [filterProduct, filterWarehouse]);

  const openAdjustModal = useCallback((item) => {
    setForm({ ...EMPTY_ADJUST });
    setErrors({});
    setModal({ open: true, mode: 'adjust', data: item });
  }, []);

  const openLocationModal = useCallback((item) => {
    setForm({ locationInWarehouse: item.locationInWarehouse || '' });
    setErrors({});
    setModal({ open: true, mode: 'location', data: item });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ open: false, mode: 'add', data: null });
    setErrors({});
  }, []);

  /** Chuyển lỗi từ API (validation theo field hoặc lỗi nghiệp vụ) thành errors của form. */
  const applyApiError = useCallback((err, fallback) => {
    if (err instanceof ApiClientError && Array.isArray(err.details) && err.details.length) {
      const fieldErrs = {};
      err.details.forEach((d) => {
        const [field, msg] = String(d).split(': ');
        if (field && msg) fieldErrs[field] = msg;
      });
      setErrors(Object.keys(fieldErrs).length ? fieldErrs : { general: err.message });
    } else {
      setErrors({ general: err.message || fallback });
    }
    showToast(err.message || fallback, 'error');
  }, [showToast]);

  const isNonNegInt = (v) => v !== '' && Number.isInteger(Number(v)) && Number(v) >= 0;

  const saveAdd = useCallback(async () => {
    const errs = {};
    if (!form.productId) errs.productId = 'Vui lòng chọn sản phẩm';
    if (!form.warehouseId) errs.warehouseId = 'Vui lòng chọn kho';
    if (form.initialStock !== '' && !isNonNegInt(form.initialStock)) {
      errs.initialStock = 'Tồn ban đầu phải là số nguyên không âm';
    }
    const initial = form.initialStock === '' ? 0 : Number(form.initialStock);
    const reserved = Number(form.reservedStock || 0);
    if (!Number.isInteger(reserved) || reserved < 0) {
      errs.reservedStock = 'Tồn giữ chỗ phải là số nguyên không âm';
    } else if (!errs.initialStock && reserved > initial) {
      errs.reservedStock = 'Tồn giữ chỗ không được lớn hơn tồn ban đầu';
    }
    if (form.locationInWarehouse.length > 50) errs.locationInWarehouse = 'Vị trí trong kho không quá 50 ký tự';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setIsSaving(true);
    setErrors({});
    try {
      await inventoryApi.create({
        productId: Number(form.productId),
        warehouseId: Number(form.warehouseId),
        initialStock: initial,
        reservedStock: reserved,
        locationInWarehouse: form.locationInWarehouse.trim() || null,
      });
      showToast('Đã khai báo tồn kho mới!', 'check_circle');
      closeModal();
      await fetchInventory();
    } catch (err) {
      applyApiError(err, 'Không thể lưu tồn kho');
    } finally {
      setIsSaving(false);
    }
  }, [form, closeModal, fetchInventory, showToast, applyApiError]);

  const saveAdjust = useCallback(async () => {
    const item = modal.data;
    const type = form.adjustmentType;
    const qty = Number(form.quantity);
    const errs = {};
    const quantityError = validateAdjustment(item, type, form.quantity);
    if (quantityError) errs.quantity = quantityError;
    if (form.reason.length > 255) errs.reason = 'Lý do không quá 255 ký tự';
    if (form.referenceDoc.length > 50) errs.referenceDoc = 'Mã chứng từ không quá 50 ký tự';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setIsSaving(true);
    setErrors({});
    try {
      await inventoryApi.adjust(item.id, {
        adjustmentType: type,
        quantity: qty,
        reason: form.reason.trim() || null,
        referenceDoc: form.referenceDoc.trim() || null,
      });
      showToast(`Đã điều chỉnh tồn ${item.productSku} @ ${item.warehouseCode}`, 'check_circle');
      closeModal();
      await fetchInventory();
    } catch (err) {
      applyApiError(err, 'Không thể điều chỉnh tồn kho');
    } finally {
      setIsSaving(false);
    }
  }, [form, modal, closeModal, fetchInventory, showToast, applyApiError]);

  const saveLocation = useCallback(async () => {
    if (form.locationInWarehouse.length > 50) {
      setErrors({ locationInWarehouse: 'Vị trí trong kho không quá 50 ký tự' });
      return;
    }
    setIsSaving(true);
    setErrors({});
    try {
      await inventoryApi.update(modal.data.id, { locationInWarehouse: form.locationInWarehouse.trim() });
      showToast('Đã cập nhật vị trí lưu kho', 'check_circle');
      closeModal();
      await fetchInventory();
    } catch (err) {
      applyApiError(err, 'Không thể cập nhật vị trí');
    } finally {
      setIsSaving(false);
    }
  }, [form, modal, closeModal, fetchInventory, showToast, applyApiError]);

  const saveModal = useCallback(() => {
    if (modal.mode === 'add') return saveAdd();
    if (modal.mode === 'adjust') return saveAdjust();
    return saveLocation();
  }, [modal.mode, saveAdd, saveAdjust, saveLocation]);

  return {
    items, rows, summary, products, warehouses,
    isLoading, loadError, fetchInventory,
    // filters
    filterWarehouse, setFilterWarehouse,
    filterProduct, setFilterProduct,
    filterStatus, setFilterStatus,
    search, setSearch,
    hasActiveFilter, resetFilters,
    // modal
    modal, form, setForm, errors, isSaving,
    openAddModal, openAdjustModal, openLocationModal, closeModal, saveModal,
    // toast
    toast, showToast,
  };
}
