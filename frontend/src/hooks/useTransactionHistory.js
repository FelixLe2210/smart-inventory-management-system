import { useState, useEffect, useCallback, useMemo } from 'react';
import { inventoryApi } from '../api/inventoryApi';
import { productApi } from '../api/productApi';
import { warehouseApi } from '../api/warehouseApi';
import { filterTransactions } from '../utils/stockMovement';

/**
 * Hook useTransactionHistory
 * Quản lý lịch sử giao dịch biến động kho (/transactions)
 */
export function useTransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [inventories, setInventories] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isBackendSupported, setIsBackendSupported] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterWarehouse, setFilterWarehouse] = useState('all');
  const [filterProduct, setFilterProduct] = useState('all');
  const [search, setSearch] = useState('');

  // Nạp dữ liệu
  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const [pRes, wRes, invRes] = await Promise.allSettled([
        productApi.getAll(),
        warehouseApi.getAll(),
        inventoryApi.getAll(),
      ]);

      const prods = pRes.status === 'fulfilled' && Array.isArray(pRes.value) ? pRes.value : [];
      const whs = wRes.status === 'fulfilled' && Array.isArray(wRes.value) ? wRes.value : [];
      const invs = invRes.status === 'fulfilled' && Array.isArray(invRes.value) ? invRes.value : [];

      setProducts(prods);
      setWarehouses(whs);
      setInventories(invs);

      // Map lookup để enrich giao dịch
      const prodMap = new Map(prods.map((p) => [p.id, p]));
      const whMap = new Map(whs.map((w) => [w.id, w]));

      // Tải lịch sử giao dịch từ các dòng tồn kho nếu backend hỗ trợ
      let allTxns = [];
      let backendHasEndpoint = true;

      if (invs.length > 0) {
        // Lấy thử giao dịch của tối đa 10 inventory items gần nhất
        const txnPromises = invs.slice(0, 15).map((inv) =>
          inventoryApi.getTransactions(inv.id).catch((err) => {
            if (err?.status === 404 || err?.status === 501) {
              backendHasEndpoint = false;
            }
            return [];
          })
        );

        const results = await Promise.all(txnPromises);
        results.forEach((list) => {
          if (Array.isArray(list)) {
            allTxns.push(...list);
          }
        });
      }

      setIsBackendSupported(backendHasEndpoint);

      // Enrich dữ liệu cho bảng hiển thị
      const enriched = allTxns.map((t) => {
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

      // Sắp xếp giao dịch mới nhất lên đầu
      enriched.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setTransactions(enriched);
    } catch (err) {
      setLoadError(err.message || 'Không thể tải lịch sử giao dịch.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Danh sách đã qua lọc
  const filteredTransactions = useMemo(() => {
    return filterTransactions(transactions, {
      type: filterType,
      warehouseId: filterWarehouse,
      productId: filterProduct,
      search,
    });
  }, [transactions, filterType, filterWarehouse, filterProduct, search]);

  const hasActiveFilter = filterType !== 'all' || filterWarehouse !== 'all' || filterProduct !== 'all' || !!search;

  const resetFilters = useCallback(() => {
    setFilterType('all');
    setFilterWarehouse('all');
    setFilterProduct('all');
    setSearch('');
  }, []);

  return {
    transactions: filteredTransactions,
    rawCount: transactions.length,
    isLoading,
    isBackendSupported,
    loadError,
    fetchAll,
    products,
    warehouses,
    filterType,
    setFilterType,
    filterWarehouse,
    setFilterWarehouse,
    filterProduct,
    setFilterProduct,
    search,
    setSearch,
    hasActiveFilter,
    resetFilters,
  };
}
