import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { inventoryApi } from '../api/inventoryApi';
import { productApi } from '../api/productApi';
import { warehouseApi } from '../api/warehouseApi';
import { ApiClientError } from '../api/ApiClientError';
import { validateReceiving, validateIssuing } from '../utils/stockMovement';

const EMPTY_FORM = {
  productId: '',
  warehouseId: '',
  quantity: '',
  referenceDoc: '',
  reason: '',
  locationInWarehouse: '',
};

/**
 * Custom Hook useStockMovement
 * Quản lý trạng thái thực hiện Nhập kho (Inbound/Receiving) & Xuất kho (Outbound/Issuing)
 * @param {'RECEIVING' | 'ISSUING'} mode
 */
export function useStockMovement(mode = 'RECEIVING') {
  const isReceiving = mode === 'RECEIVING';

  // Master data
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Form state
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Danh sách giao dịch vừa thực hiện trong phiên làm việc
  const [recentMovements, setRecentMovements] = useState([]);

  // Toast
  const [toast, setToast] = useState({ visible: false, text: '', icon: 'check_circle' });
  const toastTimer = useRef(null);
  const showToast = useCallback((text, icon = 'check_circle') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, text, icon });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3500);
  }, []);

  // Tải danh sách Sản phẩm, Kho và Tồn kho hiện có
  const loadInitialData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [prodsRes, whsRes, invsRes] = await Promise.allSettled([
        productApi.getAll(),
        warehouseApi.getAll(),
        inventoryApi.getAll(),
      ]);

      if (prodsRes.status === 'fulfilled' && Array.isArray(prodsRes.value)) {
        setProducts(prodsRes.value);
      }
      if (whsRes.status === 'fulfilled' && Array.isArray(whsRes.value)) {
        setWarehouses(whsRes.value);
      }
      if (invsRes.status === 'fulfilled' && Array.isArray(invsRes.value)) {
        setInventories(invsRes.value);
      }
    } catch (err) {
      showToast('Không thể tải danh mục dữ liệu phục vụ điều phối kho', 'error');
    } finally {
      setIsLoadingData(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Thông tin bản ghi tồn kho hiện tại tương ứng với cặp (product, warehouse)
  const currentInventory = useMemo(() => {
    if (!form.productId || !form.warehouseId) return null;
    return (
      inventories.find(
        (i) => Number(i.productId) === Number(form.productId) && Number(i.warehouseId) === Number(form.warehouseId)
      ) || null
    );
  }, [inventories, form.productId, form.warehouseId]);

  // Thông tin Product & Warehouse đang chọn
  const selectedProduct = useMemo(() => {
    if (!form.productId) return null;
    return products.find((p) => Number(p.id) === Number(form.productId)) || null;
  }, [products, form.productId]);

  const selectedWarehouse = useMemo(() => {
    if (!form.warehouseId) return null;
    return warehouses.find((w) => Number(w.id) === Number(form.warehouseId)) || null;
  }, [warehouses, form.warehouseId]);

  // Tính toán tồn sau khi thực hiện
  const previewStock = useMemo(() => {
    const current = currentInventory ? Number(currentInventory.currentStock || 0) : 0;
    const reserved = currentInventory ? Number(currentInventory.reservedStock || 0) : 0;
    const qty = Number(form.quantity) || 0;

    if (isReceiving) {
      const nextCurrent = current + qty;
      const nextAvailable = nextCurrent - reserved;
      return {
        beforeStock: current,
        afterStock: nextCurrent,
        beforeAvailable: current - reserved,
        afterAvailable: nextAvailable,
        isNewRecord: !currentInventory,
      };
    } else {
      const nextCurrent = Math.max(0, current - qty);
      const nextAvailable = current - reserved - qty;
      return {
        beforeStock: current,
        afterStock: nextCurrent,
        beforeAvailable: current - reserved,
        afterAvailable: nextAvailable,
        isNewRecord: false,
      };
    }
  }, [currentInventory, form.quantity, isReceiving]);

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[field];
      delete copy.general;
      return copy;
    });
  }, []);

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setErrors({});
  }, []);

  // Xử lý gửi biểu mẫu Nhập / Xuất kho
  const handleSubmit = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // 1. Client validation
    const validationErrors = isReceiving
      ? validateReceiving(form)
      : validateIssuing({
          ...form,
          availableStock: currentInventory ? currentInventory.availableStock : 0,
        });

    // Cảnh báo nếu kho đang không hoạt động (ACTIVE)
    if (selectedWarehouse && selectedWarehouse.status !== 'ACTIVE') {
      validationErrors.warehouseId = `Kho "${selectedWarehouse.name}" đang ở trạng thái ${selectedWarehouse.status}, không thể xuất/nhập!`;
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      let targetInventoryId = currentInventory ? currentInventory.id : null;

      // Nếu nhập kho mà chưa có bản ghi tồn kho -> Gọi POST /api/inventories để tạo mới
      if (isReceiving && !targetInventoryId) {
        const createdInv = await inventoryApi.create({
          productId: Number(form.productId),
          warehouseId: Number(form.warehouseId),
          initialStock: Number(form.quantity),
          reservedStock: 0,
          locationInWarehouse: form.locationInWarehouse?.trim() || null,
        });
        targetInventoryId = createdInv.id;
      } else {
        // Có sẵn bản ghi tồn kho -> Gọi API receive (adjust IN) hoặc issue (adjust OUT)
        const payload = {
          quantity: Number(form.quantity),
          referenceDoc: form.referenceDoc?.trim() || null,
          reason: form.reason?.trim() || null,
        };

        if (isReceiving) {
          await inventoryApi.receive(targetInventoryId, payload);
        } else {
          await inventoryApi.issue(targetInventoryId, payload);
        }
      }

      // Lưu lại vào danh sách giao dịch vừa thực hiện
      const movementRecord = {
        id: Date.now(),
        type: isReceiving ? 'RECEIVING' : 'ISSUING',
        productSku: selectedProduct?.sku || '---',
        productName: selectedProduct?.name || '---',
        warehouseCode: selectedWarehouse?.code || '---',
        warehouseName: selectedWarehouse?.name || '---',
        quantity: Number(form.quantity),
        referenceDoc: form.referenceDoc?.trim() || '---',
        reason: form.reason?.trim() || '---',
        balanceBefore: previewStock.beforeStock,
        balanceAfter: previewStock.afterStock,
        timestamp: new Date().toISOString(),
      };
      setRecentMovements((prev) => [movementRecord, ...prev]);

      showToast(
        isReceiving
          ? `Nhập kho thành công ${form.quantity} ${selectedProduct?.unit || 'đơn vị'} (${selectedProduct?.sku})!`
          : `Xuất kho thành công ${form.quantity} ${selectedProduct?.unit || 'đơn vị'} (${selectedProduct?.sku})!`,
        'check_circle'
      );

      // Làm mới lại dữ liệu tồn kho ngầm
      const freshInvs = await inventoryApi.getAll();
      if (Array.isArray(freshInvs)) {
        setInventories(freshInvs);
      }

      // Reset form
      resetForm();
    } catch (err) {
      if (err instanceof ApiClientError && Array.isArray(err.details) && err.details.length) {
        const fieldErrs = {};
        err.details.forEach((d) => {
          const [field, msg] = String(d).split(': ');
          if (field && msg) fieldErrs[field] = msg;
        });
        setErrors(Object.keys(fieldErrs).length ? fieldErrs : { general: err.message });
      } else {
        setErrors({ general: err.message || 'Thao tác thất bại. Vui lòng thử lại.' });
      }
      showToast(err.message || 'Thao tác thất bại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isReceiving,
    form,
    currentInventory,
    selectedWarehouse,
    selectedProduct,
    previewStock,
    showToast,
    resetForm,
  ]);

  return {
    mode,
    isReceiving,
    products,
    warehouses,
    inventories,
    isLoadingData,
    loadInitialData,
    form,
    errors,
    isSubmitting,
    currentInventory,
    selectedProduct,
    selectedWarehouse,
    previewStock,
    recentMovements,
    updateField,
    resetForm,
    handleSubmit,
    toast,
    showToast,
  };
}
