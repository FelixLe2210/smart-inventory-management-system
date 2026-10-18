import { useState, useEffect, useCallback, useMemo } from 'react';
import { inventoryApi } from '../api/inventoryApi';
import { productApi } from '../api/productApi';
import { warehouseApi } from '../api/warehouseApi';
import { categoryApi } from '../api/categoryApi';
import {
  calculateKpis,
  calculateCategoryDistribution,
  calculateWarehouseStock,
  calculateTransactionBreakdown,
} from '../utils/dashboard';

/**
 * Hook useDashboard
 * Quản trị trạng thái và dữ liệu tổng hợp cho Bàn làm việc (Dashboard)
 * Sprint 6 - Milestone M3 (Sprint6-09 -> Sprint6-12)
 */
export function useDashboard() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [pRes, wRes, cRes, iRes] = await Promise.allSettled([
        productApi.getAll(),
        warehouseApi.getAll(),
        categoryApi.getAll ? categoryApi.getAll() : Promise.resolve([]),
        inventoryApi.getAll(),
      ]);

      const prods = pRes.status === 'fulfilled' && Array.isArray(pRes.value) ? pRes.value : [];
      const whs = wRes.status === 'fulfilled' && Array.isArray(wRes.value) ? wRes.value : [];
      const cats = cRes.status === 'fulfilled' && Array.isArray(cRes.value) ? cRes.value : [];
      const invs = iRes.status === 'fulfilled' && Array.isArray(iRes.value) ? iRes.value : [];

      setProducts(prods);
      setWarehouses(whs);
      setCategories(cats);
      setInventories(invs);

      // Tạo map tra cứu nhanh
      const prodMap = new Map(prods.map((p) => [p.id, p]));
      const whMap = new Map(whs.map((w) => [w.id, w]));

      // Tải các giao dịch gần đây từ các dòng tồn kho
      let txns = [];
      if (invs.length > 0) {
        const topInvs = invs.slice(0, 15);
        const txnResults = await Promise.allSettled(
          topInvs.map((inv) => inventoryApi.getTransactions(inv.id))
        );

        txnResults.forEach((res, idx) => {
          if (res.status === 'fulfilled' && Array.isArray(res.value)) {
            const currentInv = topInvs[idx];
            const p = prodMap.get(currentInv?.productId);
            const w = whMap.get(currentInv?.warehouseId);

            res.value.forEach((tx) => {
              txns.push({
                ...tx,
                productName: tx.productName || p?.name || 'Sản phẩm',
                productSku: tx.productSku || p?.sku || 'SKU',
                warehouseName: tx.warehouseName || w?.name || 'Kho',
                warehouseCode: tx.warehouseCode || w?.code || '',
              });
            });
          }
        });

        // Sắp xếp theo ngày tạo mới nhất
        txns.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      }

      setTransactions(txns);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu dashboard:', err);
      setError('Không thể tải toàn bộ dữ liệu bảng điều khiển. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Các dữ liệu tính toán sẵn
  const kpis = useMemo(
    () => calculateKpis(products, inventories, warehouses),
    [products, inventories, warehouses]
  );

  const categoryDistribution = useMemo(
    () => calculateCategoryDistribution(inventories, products, categories),
    [inventories, products, categories]
  );

  const warehouseStocks = useMemo(
    () => calculateWarehouseStock(inventories, warehouses),
    [inventories, warehouses]
  );

  const transactionBreakdown = useMemo(
    () => calculateTransactionBreakdown(transactions),
    [transactions]
  );

  // Top 10 giao dịch gần nhất
  const recentTransactions = useMemo(
    () => transactions.slice(0, 8),
    [transactions]
  );

  // Danh sách các mặt hàng cần chú ý (hết hàng hoặc sắp hết hàng)
  const stockAlerts = useMemo(() => {
    const alerts = [];
    const prodMap = new Map();

    inventories.forEach((inv) => {
      const current = prodMap.get(inv.productId) || 0;
      const avail = inv.availableStock !== undefined ? inv.availableStock : (inv.quantity - inv.reservedStock);
      prodMap.set(inv.productId, current + avail);
    });

    products.forEach((p) => {
      const avail = prodMap.get(p.id) || 0;
      const min = Number(p.minStockLevel || 0);

      if (avail === 0) {
        alerts.push({
          product: p,
          type: 'OUT_OF_STOCK',
          available: 0,
          minStock: min,
          message: 'Đã hết hàng trong kho',
          priority: 'high',
        });
      } else if (min > 0 && avail <= min) {
        alerts.push({
          product: p,
          type: 'LOW_STOCK',
          available: avail,
          minStock: min,
          message: `Sắp hết hàng (${avail}/${min})`,
          priority: 'medium',
        });
      }
    });

    return alerts.slice(0, 6);
  }, [products, inventories]);

  return {
    isLoading,
    error,
    lastRefreshedAt,
    kpis,
    categoryDistribution,
    warehouseStocks,
    transactionBreakdown,
    recentTransactions,
    stockAlerts,
    refetch: fetchDashboardData,
  };
}
