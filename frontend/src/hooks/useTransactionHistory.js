import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { inventoryApi } from '../api/inventoryApi';
import { productApi } from '../api/productApi';
import { warehouseApi } from '../api/warehouseApi';

const PAGE_SIZE = 25;

/**
 * Hook useTransactionHistory
 * Quản lý lịch sử giao dịch biến động kho (/transactions)
 */
export function useTransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isBackendSupported, setIsBackendSupported] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterWarehouse, setFilterWarehouse] = useState('all');
  const [filterProduct, setFilterProduct] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const requestId = useRef(0);

  // Load the current server page with filters applied before pagination.
  const fetchAll = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setIsLoading(true);
    setLoadError('');
    try {
      const [pRes, wRes, txRes] = await Promise.allSettled([
        productApi.getAll(),
        warehouseApi.getAll(),
        inventoryApi.getTransactionHistory({
          productId: filterProduct,
          warehouseId: filterWarehouse,
          type: filterType,
          search: search.trim(),
          page,
          size: PAGE_SIZE,
        }),
      ]);

      const prods = pRes.status === 'fulfilled' && Array.isArray(pRes.value) ? pRes.value : [];
      const whs = wRes.status === 'fulfilled' && Array.isArray(wRes.value) ? wRes.value : [];
      if (txRes.status === 'rejected') throw txRes.reason;
      const txPage = txRes.value;
      if (!txPage || !Array.isArray(txPage.content)) {
        throw new Error('Backend trả về dữ liệu lịch sử giao dịch không hợp lệ.');
      }

      if (currentRequestId !== requestId.current) return;
      setProducts(prods);
      setWarehouses(whs);

      const prodMap = new Map(prods.map((p) => [p.id, p]));
      const whMap = new Map(whs.map((w) => [w.id, w]));
      const enriched = txPage.content.map((t) => {
        const prod = prodMap.get(t.productId);
        const srcWh = whMap.get(t.sourceWarehouseId);
        const destWh = whMap.get(t.destinationWarehouseId);

        return {
          ...t,
          productSku: prod?.sku || `SKU #${t.productId}`,
          productName: prod?.name || `Sản phẩm #${t.productId}`,
          productUnit: prod?.unit || 'đơn vị',
          sourceWarehouseCode: srcWh?.code || (t.sourceWarehouseId ? `KHO-${t.sourceWarehouseId}` : '---'),
          sourceWarehouseName: srcWh?.name || '---',
          destinationWarehouseCode: destWh?.code || (t.destinationWarehouseId ? `KHO-${t.destinationWarehouseId}` : '---'),
          destinationWarehouseName: destWh?.name || '---',
        };
      });

      setIsBackendSupported(true);
      setTransactions(enriched);
      setTotalElements(txPage.totalElements);
      setTotalPages(txPage.totalPages);
    } catch (err) {
      if (currentRequestId === requestId.current) {
        setIsBackendSupported(err?.status !== 404 && err?.status !== 501);
        setLoadError(err.message || 'Không thể tải lịch sử giao dịch.');
        setTransactions([]);
        setTotalElements(0);
        setTotalPages(0);
      }
    } finally {
      if (currentRequestId === requestId.current) setIsLoading(false);
    }
  }, [filterProduct, filterType, filterWarehouse, page, search]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const hasActiveFilter = filterType !== 'all' || filterWarehouse !== 'all' || filterProduct !== 'all' || !!search;
  const updateFilter = useCallback((setter) => (value) => {
    setter(value);
    setPage(0);
  }, []);

  const resetFilters = useCallback(() => {
    setFilterType('all');
    setFilterWarehouse('all');
    setFilterProduct('all');
    setSearch('');
    setPage(0);
  }, []);

  return {
    transactions,
    rawCount: totalElements,
    page,
    totalPages,
    canGoToPreviousPage: page > 0,
    canGoToNextPage: page + 1 < totalPages,
    goToPreviousPage: () => setPage((current) => Math.max(0, current - 1)),
    goToNextPage: () => setPage((current) => Math.min(totalPages - 1, current + 1)),
    isLoading,
    isBackendSupported,
    loadError,
    fetchAll,
    products,
    warehouses,
    filterType,
    setFilterType: updateFilter(setFilterType),
    filterWarehouse,
    setFilterWarehouse: updateFilter(setFilterWarehouse),
    filterProduct,
    setFilterProduct: updateFilter(setFilterProduct),
    search,
    setSearch: updateFilter(setSearch),
    hasActiveFilter,
    resetFilters,
  };
}
