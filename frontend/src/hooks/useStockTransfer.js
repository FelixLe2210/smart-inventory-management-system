import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { inventoryApi } from '../api/inventoryApi';
import { productApi } from '../api/productApi';
import { warehouseApi } from '../api/warehouseApi';
import {
  validateTransfer,
  getSourceOptions,
  getDestinationOptions,
  getTransferableProducts,
  previewTransfer,
  verifyTransferResult,
} from '../utils/stockTransfer';
import { mapTransactionError, toFormErrors } from '../utils/transactionErrors';

const EMPTY_FORM = {
  productId: '',
  sourceWarehouseId: '',
  destinationWarehouseId: '',
  quantity: '',
  referenceDoc: '',
  reason: '',
};

/**
 * useStockTransfer - logic & state cho trang Chuyển kho (/transfer)
 * Sprint 5 - M4 (Sprint5-13 UI/Flow, Sprint5-14 Integration, Sprint5-15 Error handling)
 *
 * Luồng: chọn sản phẩm -> kho nguồn (dòng tồn còn khả dụng) -> kho đích (ACTIVE, khác nguồn) -> số lượng
 *   -> POST /inventories/{sourceInventoryId}/transfer -> đọc lại tồn thật từ server và đối chiếu.
 *
 * @param {{productId?:string, sourceWarehouseId?:string}} initial giá trị khởi tạo (từ query string)
 */
export function useStockTransfer(initial = {}) {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [recentTransfers, setRecentTransfers] = useState([]);
  const [toast, setToast] = useState({ visible: false, text: '', icon: 'check_circle' });

  const toastTimer = useRef(null);
  const appliedInitial = useRef(false);

  const showToast = useCallback((text, icon = 'check_circle') => {
    setToast({ visible: true, text, icon });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 4500);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  /** silent = tải lại ngầm (không bật màn hình loading, không làm mất form đang nhập). */
  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoadingData(true);
    setLoadError('');
    try {
      const [p, w, i] = await Promise.all([
        productApi.getAll(),
        warehouseApi.getAll(),
        inventoryApi.getAll(),
      ]);
      setProducts(Array.isArray(p) ? p : []);
      setWarehouses(Array.isArray(w) ? w : []);
      setInventories(Array.isArray(i) ? i : []);
    } catch (err) {
      setLoadError(mapTransactionError(err).message);
    } finally {
      if (!silent) setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Áp giá trị khởi tạo (từ nút "Chuyển kho" ở trang Tồn kho) đúng một lần sau khi có dữ liệu.
  useEffect(() => {
    if (appliedInitial.current || isLoadingData) return;
    appliedInitial.current = true;
    const pid = initial.productId;
    if (!pid) return;
    const options = getSourceOptions(inventories, pid, warehouses);
    if (options.length === 0) return;
    const wantedSource = initial.sourceWarehouseId;
    let source = '';
    if (wantedSource && options.some((o) => String(o.warehouseId) === String(wantedSource))) {
      source = String(wantedSource);
    } else if (options.length === 1) {
      source = String(options[0].warehouseId);
    }
    setForm((f) => ({ ...f, productId: String(pid), sourceWarehouseId: source }));
  }, [isLoadingData, inventories, warehouses, initial.productId, initial.sourceWarehouseId]);

  // ── Dữ liệu suy ra từ lựa chọn hiện tại ─────────────────────────────
  const transferableProducts = useMemo(
    () => getTransferableProducts(products, inventories, warehouses),
    [products, inventories, warehouses]
  );
  const sourceOptions = useMemo(
    () => getSourceOptions(inventories, form.productId, warehouses),
    [inventories, warehouses, form.productId]
  );
  const sourceInventory = useMemo(
    () => sourceOptions.find((i) => String(i.warehouseId) === String(form.sourceWarehouseId)) || null,
    [sourceOptions, form.sourceWarehouseId]
  );
  const destinationOptions = useMemo(
    () => getDestinationOptions(warehouses, form.sourceWarehouseId),
    [warehouses, form.sourceWarehouseId]
  );
  const destinationInventory = useMemo(
    () =>
      inventories.find(
        (i) =>
          String(i.productId) === String(form.productId) &&
          String(i.warehouseId) === String(form.destinationWarehouseId)
      ) || null,
    [inventories, form.productId, form.destinationWarehouseId]
  );
  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(form.productId)) || null,
    [products, form.productId]
  );
  const destinationWarehouse = useMemo(
    () => warehouses.find((w) => String(w.id) === String(form.destinationWarehouseId)) || null,
    [warehouses, form.destinationWarehouseId]
  );
  const preview = useMemo(
    () => previewTransfer({ sourceInventory, destinationInventory, quantity: form.quantity }),
    [sourceInventory, destinationInventory, form.quantity]
  );

  // ── Thao tác trên form ──────────────────────────────────────────────
  const updateField = useCallback(
    (name, value) => {
      setForm((prev) => {
        const next = { ...prev, [name]: value };
        if (name === 'productId') {
          const options = getSourceOptions(inventories, value, warehouses);
          next.sourceWarehouseId = options.length === 1 ? String(options[0].warehouseId) : '';
          next.destinationWarehouseId = '';
          next.quantity = '';
        }
        if (name === 'sourceWarehouseId' && String(value) === String(prev.destinationWarehouseId)) {
          next.destinationWarehouseId = '';
        }
        return next;
      });
      setErrors((prev) => {
        if (!prev[name] && !prev.general) return prev;
        const rest = { ...prev };
        delete rest[name];
        delete rest.general;
        return rest;
      });
      setSubmitError(null);
    },
    [inventories, warehouses]
  );

  const fillAllAvailable = useCallback(() => {
    if (!sourceInventory) return;
    updateField('quantity', String(Number(sourceInventory.availableStock || 0)));
  }, [sourceInventory, updateField]);

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setErrors({});
    setSubmitError(null);
    setLastResult(null);
  }, []);

  // ── Gửi giao dịch chuyển kho ────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e) => {
      if (e && e.preventDefault) e.preventDefault();
      if (isSubmitting) return;

      const available = sourceInventory ? Number(sourceInventory.availableStock || 0) : undefined;
      const v = validateTransfer({ ...form, availableStock: available });
      if (!v.sourceWarehouseId && form.productId && form.sourceWarehouseId && !sourceInventory) {
        v.sourceWarehouseId = 'Sản phẩm không còn tồn khả dụng tại kho nguồn đã chọn';
      }
      if (Object.keys(v).length > 0) {
        setErrors(v);
        return;
      }

      const quantity = Number(form.quantity);
      const { sourceBefore, destinationBefore, destinationIsNew } = preview;
      const sourceRow = sourceInventory;

      setIsSubmitting(true);
      setErrors({});
      setSubmitError(null);
      setLastResult(null);

      try {
        await inventoryApi.transfer(sourceRow.id, {
          destinationWarehouseId: Number(form.destinationWarehouseId),
          quantity,
          referenceDoc: form.referenceDoc.trim() || null,
          reason: form.reason.trim() || null,
        });

        // Đọc lại tồn THẬT từ server rồi đối chiếu, không chỉ tin vào phản hồi thành công.
        const fresh = await inventoryApi.getAll();
        const freshList = Array.isArray(fresh) ? fresh : [];
        setInventories(freshList);
        const freshSource = freshList.find((i) => i.id === sourceRow.id);
        const freshDestination = freshList.find(
          (i) =>
            String(i.productId) === String(form.productId) &&
            String(i.warehouseId) === String(form.destinationWarehouseId)
        );
        const consistency =
          freshSource && freshDestination
            ? verifyTransferResult({
                sourceBefore,
                destinationBefore,
                sourceAfter: Number(freshSource.currentStock),
                destinationAfter: Number(freshDestination.currentStock),
                quantity,
              })
            : { ok: false, problems: ['Không đọc lại được tồn kho sau giao dịch'] };

        // Mã giao dịch (TXN-...-OUT / -IN): lấy từ lịch sử, lỗi ở bước này không làm hỏng kết quả.
        let transactionCode = null;
        try {
          const txs = await inventoryApi.getTransactions(sourceRow.id);
          const out = (Array.isArray(txs) ? txs : []).find(
            (t) => t.transactionType === 'TRANSFER_OUT' && Number(t.quantity) === quantity
          );
          if (out && out.transactionCode) transactionCode = String(out.transactionCode).replace(/-OUT$/, '');
        } catch {
          transactionCode = null;
        }

        const result = {
          id: `${Date.now()}-${sourceRow.id}`,
          at: new Date().toISOString(),
          productSku: sourceRow.productSku,
          productName: sourceRow.productName,
          unit: sourceRow.productUnit || selectedProduct?.unit || '',
          sourceCode: sourceRow.warehouseCode,
          sourceName: sourceRow.warehouseName,
          destinationCode: destinationWarehouse?.code || freshDestination?.warehouseCode || '',
          destinationName: destinationWarehouse?.name || freshDestination?.warehouseName || '',
          quantity,
          sourceBefore,
          sourceAfter: freshSource ? Number(freshSource.currentStock) : null,
          destinationBefore,
          destinationAfter: freshDestination ? Number(freshDestination.currentStock) : null,
          destinationWasNew: destinationIsNew,
          referenceDoc: form.referenceDoc.trim(),
          reason: form.reason.trim(),
          transactionCode,
          consistency,
        };
        setLastResult(result);
        setRecentTransfers((prev) => [result, ...prev].slice(0, 20));
        setForm(EMPTY_FORM);
        showToast(
          consistency.ok ? 'Chuyển kho thành công' : 'Đã chuyển kho nhưng số liệu đối chiếu chưa khớp, hãy kiểm tra',
          consistency.ok ? 'check_circle' : 'warning'
        );
      } catch (err) {
        const info = mapTransactionError(err);
        setErrors(toFormErrors(info));
        setSubmitError(info);
        showToast(info.message, 'error');
        if (info.reload) loadData({ silent: true });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      form, isSubmitting, sourceInventory, preview, selectedProduct, destinationWarehouse, showToast, loadData,
    ]
  );

  return {
    // dữ liệu
    isLoadingData, loadError, loadData,
    transferableProducts, sourceOptions, destinationOptions,
    selectedProduct, sourceInventory, destinationInventory, destinationWarehouse,
    preview,
    // form
    form, errors, submitError, isSubmitting,
    updateField, fillAllAvailable, resetForm, handleSubmit,
    // kết quả
    lastResult, recentTransfers,
    toast,
  };
}
