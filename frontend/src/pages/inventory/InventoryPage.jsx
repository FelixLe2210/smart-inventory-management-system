import { useCallback, useEffect, useMemo, useState } from 'react';
import { inventoryApi } from '../../api/inventoryApi';
import { productApi } from '../../api/productApi';
import { warehouseApi } from '../../api/warehouseApi';
import InventoryDetailModal from './InventoryDetailModal';

const STATUS_DETAILS = {
  IN_STOCK: { label: 'Đủ hàng', classes: 'bg-emerald-50 text-emerald-700', icon: 'check_circle' },
  LOW_STOCK: { label: 'Sắp hết', classes: 'bg-amber-50 text-amber-700', icon: 'warning' },
  OUT_OF_STOCK: { label: 'Hết hàng', classes: 'bg-red-50 text-red-700', icon: 'error' },
  OVER_STOCK: { label: 'Dư tồn', classes: 'bg-blue-50 text-blue-700', icon: 'inventory_2' },
};

const numberFormat = new Intl.NumberFormat('vi-VN');

function formatUpdatedAt(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export default function InventoryPage() {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [search, setSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [status, setStatus] = useState('all');
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [optionsError, setOptionsError] = useState('');
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const loadOptions = useCallback(async () => {
    setOptionsError('');
    const [productResult, warehouseResult] = await Promise.allSettled([
      productApi.getAll(),
      warehouseApi.getAll(),
    ]);
    if (productResult.status === 'fulfilled' && Array.isArray(productResult.value)) {
      setProducts(productResult.value);
    }
    if (warehouseResult.status === 'fulfilled' && Array.isArray(warehouseResult.value)) {
      setWarehouses(warehouseResult.value);
    }
    const failures = [];
    if (productResult.status !== 'fulfilled' || !Array.isArray(productResult.value)) failures.push('sản phẩm');
    if (warehouseResult.status !== 'fulfilled' || !Array.isArray(warehouseResult.value)) failures.push('kho');
    if (failures.length) setOptionsError(`Không thể tải danh sách lọc: ${failures.join(', ')}.`);
  }, []);

  const loadInventory = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const params = {};
      if (productId) params.productId = productId;
      if (warehouseId) params.warehouseId = warehouseId;
      const result = await inventoryApi.getAll(params);
      if (!Array.isArray(result)) throw new Error('Máy chủ trả về danh sách tồn kho không hợp lệ.');
      setRows(result);
    } catch (err) {
      setLoadError(err.message || 'Không thể tải danh sách tồn kho.');
    } finally {
      setIsLoading(false);
    }
  }, [productId, warehouseId]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return rows.filter((row) => {
      const matchesSearch = !query || [
        row.productSku,
        row.productName,
        row.productBarcode,
        row.warehouseCode,
        row.warehouseName,
        row.locationInWarehouse,
      ].some((value) => value?.toLocaleLowerCase('vi').includes(query));
      const matchesStatus = status === 'all' || row.stockStatus === status;
      const matchesLowStock = !showLowOnly || ['LOW_STOCK', 'OUT_OF_STOCK'].includes(row.stockStatus);
      return matchesSearch && matchesStatus && matchesLowStock;
    });
  }, [rows, search, status, showLowOnly]);

  const totals = useMemo(() => ({
    skuCount: rows.length,
    current: rows.reduce((sum, row) => sum + (row.currentStock || 0), 0),
    available: rows.reduce((sum, row) => sum + (row.availableStock || 0), 0),
    needsAttention: rows.filter((row) => ['LOW_STOCK', 'OUT_OF_STOCK'].includes(row.stockStatus)).length,
  }), [rows]);

  const openDetails = async (row) => {
    setNotice('');
    try {
      const detail = await inventoryApi.getById(row.id);
      setSelectedInventory(detail);
    } catch (err) {
      setNotice(err.message || 'Không thể tải chi tiết tồn kho.');
    }
  };

  const adjustStock = async (id, payload) => {
    setIsSaving(true);
    try {
      const updated = await inventoryApi.adjust(id, payload);
      setRows((current) => current.map((row) => row.id === updated.id ? updated : row));
      setSelectedInventory(updated);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full">
      <header className="flex flex-col gap-4 bg-white px-5 py-5 shadow-sm sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-2 text-label-default text-secondary">
            <span>Vận hành kho</span><span aria-hidden="true">/</span><span className="text-on-surface">Danh sách tồn kho</span>
          </nav>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Danh sách tồn kho</h1>
            <span className="rounded-full bg-surface-container px-3 py-1 text-label-default font-medium text-primary">
              {numberFormat.format(filteredRows.length)} bản ghi
            </span>
          </div>
          <p className="mt-1 text-body-sm text-secondary">Theo dõi số lượng sản phẩm theo từng chi nhánh kho.</p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg border border-outline-variant bg-white px-4 text-body-sm-medium text-on-surface hover:bg-surface-container-low disabled:opacity-60 lg:self-auto"
          disabled={isLoading}
          onClick={loadInventory}
          type="button"
        >
          <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
          Làm mới
        </button>
      </header>

      <main className="space-y-5 px-5 py-6 sm:px-8">
        {optionsError && (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-body-sm text-amber-800" role="alert">{optionsError}</div>
        )}
        {notice && (
          <div className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-3 text-body-sm text-red-800" role="alert">
            <span>{notice}</span>
            <button aria-label="Đóng thông báo" onClick={() => setNotice('')} type="button">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        <section aria-label="Tổng quan tồn kho" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Bản ghi sản phẩm - kho', value: totals.skuCount, icon: 'shelves', color: 'text-primary bg-blue-50' },
            { label: 'Tổng tồn hiện tại', value: totals.current, icon: 'inventory_2', color: 'text-indigo-700 bg-indigo-50' },
            { label: 'Tồn có thể xuất', value: totals.available, icon: 'outbox', color: 'text-emerald-700 bg-emerald-50' },
            { label: 'Cần chú ý', value: totals.needsAttention, icon: 'warning', color: 'text-amber-700 bg-amber-50' },
          ].map((metric) => (
            <div className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm" key={metric.label}>
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${metric.color}`}>
                <span className="material-symbols-outlined">{metric.icon}</span>
              </span>
              <div>
                <p className="text-label-default text-secondary">{metric.label}</p>
                <p className="mt-1 text-2xl font-bold text-on-surface">{numberFormat.format(metric.value)}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_200px_200px_190px_auto]">
            <label className="relative block">
              <span className="sr-only">Tìm tồn kho</span>
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-secondary">search</span>
              <input
                className="h-10 w-full rounded-lg bg-surface-container-low pl-10 pr-3 text-body-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm SKU, sản phẩm, kho, vị trí..."
                value={search}
              />
            </label>
            <label>
              <span className="sr-only">Lọc sản phẩm</span>
              <select className="h-10 w-full rounded-lg bg-surface-container-low px-3 text-body-sm text-on-surface outline-none" onChange={(event) => setProductId(event.target.value)} value={productId}>
                <option value="">Tất cả sản phẩm</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Lọc kho</span>
              <select className="h-10 w-full rounded-lg bg-surface-container-low px-3 text-body-sm text-on-surface outline-none" onChange={(event) => setWarehouseId(event.target.value)} value={warehouseId}>
                <option value="">Tất cả kho</option>
                {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.name}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Lọc trạng thái</span>
              <select className="h-10 w-full rounded-lg bg-surface-container-low px-3 text-body-sm text-on-surface outline-none" onChange={(event) => setStatus(event.target.value)} value={status}>
                <option value="all">Tất cả trạng thái</option>
                {Object.entries(STATUS_DETAILS).map(([value, detail]) => <option key={value} value={value}>{detail.label}</option>)}
              </select>
            </label>
            <button
              aria-pressed={showLowOnly}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-body-sm-medium transition-colors ${showLowOnly ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-outline-variant bg-white text-on-surface hover:bg-surface-container-low'}`}
              onClick={() => setShowLowOnly((value) => !value)}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">warning</span>
              Chỉ cần bổ sung
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl bg-white shadow-sm">
          {loadError && (
            <div className="flex flex-col gap-3 border-b border-red-100 bg-red-50 px-5 py-4 text-body-sm text-red-800 sm:flex-row sm:items-center sm:justify-between" role="alert">
              <span>{loadError}</span>
              <button className="font-medium underline" onClick={loadInventory} type="button">Thử lại</button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead className="bg-surface-container-low text-label-default uppercase tracking-wide text-secondary">
                <tr>
                  <th className="px-5 py-3 font-semibold">Sản phẩm</th>
                  <th className="px-5 py-3 font-semibold">Kho / vị trí</th>
                  <th className="px-5 py-3 text-right font-semibold">Tồn hiện tại</th>
                  <th className="px-5 py-3 text-right font-semibold">Giữ chỗ</th>
                  <th className="px-5 py-3 text-right font-semibold">Có thể xuất</th>
                  <th className="px-5 py-3 font-semibold">Trạng thái</th>
                  <th className="px-5 py-3 font-semibold">Cập nhật</th>
                  <th className="px-5 py-3 text-right font-semibold">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {isLoading ? (
                  <tr><td className="px-5 py-14 text-center text-body-sm text-secondary" colSpan={8}>
                    <span className="material-symbols-outlined mb-2 block animate-spin text-2xl">progress_activity</span>
                    Đang tải dữ liệu tồn kho...
                  </td></tr>
                ) : filteredRows.length === 0 ? (
                  <tr><td className="px-5 py-14 text-center text-body-sm text-secondary" colSpan={8}>
                    <span className="material-symbols-outlined mb-2 block text-3xl text-outline">inventory</span>
                    {rows.length ? 'Không có bản ghi phù hợp bộ lọc.' : 'Chưa có dữ liệu tồn kho.'}
                  </td></tr>
                ) : filteredRows.map((row) => {
                  const stockStatus = STATUS_DETAILS[row.stockStatus] || STATUS_DETAILS.IN_STOCK;
                  return (
                    <tr className="transition-colors hover:bg-surface-container-low/60" key={row.id}>
                      <td className="px-5 py-4">
                        <p className="font-code-mono text-code-mono font-semibold text-primary">{row.productSku}</p>
                        <p className="mt-1 max-w-[240px] truncate text-body-sm-medium text-on-surface" title={row.productName}>{row.productName}</p>
                        <p className="mt-0.5 text-label-sm text-secondary">{row.productBarcode || 'Chưa có barcode'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-body-sm-medium text-on-surface">{row.warehouseName}</p>
                        <p className="mt-1 text-label-sm text-secondary">{row.warehouseCode} · {row.locationInWarehouse || 'Chưa có vị trí'}</p>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-on-surface">{numberFormat.format(row.currentStock || 0)} <span className="font-normal text-secondary">{row.productUnit}</span></td>
                      <td className="px-5 py-4 text-right text-on-surface">{numberFormat.format(row.reservedStock || 0)}</td>
                      <td className="px-5 py-4 text-right font-semibold text-on-surface">{numberFormat.format(row.availableStock || 0)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-label-sm ${stockStatus.classes}`}>
                          <span className="material-symbols-outlined text-[15px]">{stockStatus.icon}</span>{stockStatus.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-label-default text-secondary">{formatUpdatedAt(row.updatedAt)}</td>
                      <td className="px-5 py-4 text-right">
                        <button
                          aria-label={`Xem chi tiết tồn kho ${row.productSku} tại ${row.warehouseCode}`}
                          className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-body-sm-medium text-primary hover:bg-blue-50"
                          onClick={() => openDetails(row)}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <footer className="flex flex-col gap-2 border-t border-surface-container px-5 py-3 text-label-default text-secondary sm:flex-row sm:items-center sm:justify-between">
            <span>Hiển thị {numberFormat.format(filteredRows.length)} / {numberFormat.format(rows.length)} bản ghi</span>
            <span>Dữ liệu lấy từ hệ thống tồn kho</span>
          </footer>
        </section>
      </main>

      {selectedInventory && (
        <InventoryDetailModal
          inventory={selectedInventory}
          isSaving={isSaving}
          onAdjust={adjustStock}
          onClose={() => setSelectedInventory(null)}
        />
      )}
    </div>
  );
}
