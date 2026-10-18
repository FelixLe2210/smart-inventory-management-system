import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateKpis,
  calculateCategoryDistribution,
  calculateWarehouseStock,
  calculateTransactionBreakdown,
} from './dashboard.js';

test('calculateKpis - tính toán chính xác tổng sản phẩm, tồn kho, giá trị và cảnh báo', () => {
  const products = [
    { id: 1, name: 'Sản phẩm A', minStockLevel: 10, purchasePrice: 50000 },
    { id: 2, name: 'Sản phẩm B', minStockLevel: 20, purchasePrice: 100000 },
    { id: 3, name: 'Sản phẩm C (Hết hàng)', minStockLevel: 5, purchasePrice: 30000 },
  ];

  const inventories = [
    { productId: 1, warehouseId: 10, quantity: 25, reservedStock: 5 }, // avail = 20 > 10 (ok)
    { productId: 2, warehouseId: 10, quantity: 15, reservedStock: 0 }, // avail = 15 <= 20 (low stock)
    // Product 3 không có trong inventories -> avail = 0 (out of stock)
  ];

  const warehouses = [
    { id: 10, name: 'Kho Hà Nội', status: 'ACTIVE' },
    { id: 20, name: 'Kho HCM', status: 'MAINTENANCE' },
  ];

  const kpis = calculateKpis(products, inventories, warehouses);

  assert.equal(kpis.totalProducts, 3);
  assert.equal(kpis.totalStockQuantity, 40);
  assert.equal(kpis.totalReservedQuantity, 5);
  assert.equal(kpis.totalAvailableQuantity, 35);
  assert.equal(kpis.totalInventoryValue, 25 * 50000 + 15 * 100000); // 1,250,000 + 1,500,000 = 2,750,000
  assert.equal(kpis.outOfStockCount, 1, 'Sản phẩm C phải tính là hết hàng');
  assert.equal(kpis.lowStockCount, 1, 'Sản phẩm B phải tính là sắp hết hàng');
  assert.equal(kpis.totalWarehouses, 2);
  assert.equal(kpis.activeWarehouses, 1);
});

test('calculateCategoryDistribution - phân bổ danh mục theo tỷ lệ phần trăm', () => {
  const categories = [
    { id: 100, name: 'Điện tử' },
    { id: 200, name: 'Gia dụng' },
  ];

  const products = [
    { id: 1, categoryId: 100, purchasePrice: 200 },
    { id: 2, categoryId: 200, purchasePrice: 100 },
  ];

  const inventories = [
    { productId: 1, quantity: 80 },
    { productId: 2, quantity: 20 },
  ];

  const dist = calculateCategoryDistribution(inventories, products, categories);

  assert.equal(dist.length, 2);
  assert.equal(dist[0].name, 'Điện tử');
  assert.equal(dist[0].percentage, 80);
  assert.equal(dist[1].name, 'Gia dụng');
  assert.equal(dist[1].percentage, 20);
});

test('calculateWarehouseStock - phân bổ số lượng và sản phẩm theo kho', () => {
  const warehouses = [
    { id: 1, name: 'Kho Bắc', code: 'KB' },
    { id: 2, name: 'Kho Nam', code: 'KN' },
  ];

  const inventories = [
    { warehouseId: 1, productId: 10, quantity: 100, reservedStock: 10 },
    { warehouseId: 1, productId: 20, quantity: 50, reservedStock: 0 },
    { warehouseId: 2, productId: 10, quantity: 30, reservedStock: 5 },
  ];

  const stock = calculateWarehouseStock(inventories, warehouses);

  assert.equal(stock.length, 2);
  assert.equal(stock[0].name, 'Kho Bắc');
  assert.equal(stock[0].quantity, 150);
  assert.equal(stock[0].available, 140);
  assert.equal(stock[0].itemCount, 2);

  assert.equal(stock[1].name, 'Kho Nam');
  assert.equal(stock[1].quantity, 30);
  assert.equal(stock[1].available, 25);
  assert.equal(stock[1].itemCount, 1);
});

test('calculateTransactionBreakdown - thống kê đúng phân loại giao dịch', () => {
  const transactions = [
    { transactionType: 'RECEIVING', quantity: 50 },
    { transactionType: 'RECEIVING', quantity: 20 },
    { transactionType: 'ISSUING', quantity: 15 },
    { transactionType: 'TRANSFER_IN', quantity: 10 },
    { transactionType: 'TRANSFER_OUT', quantity: 10 },
    { transactionType: 'ADJUSTMENT', quantity: 5 },
  ];

  const breakdown = calculateTransactionBreakdown(transactions);

  assert.equal(breakdown.RECEIVING.count, 2);
  assert.equal(breakdown.RECEIVING.totalQuantity, 70);
  assert.equal(breakdown.ISSUING.count, 1);
  assert.equal(breakdown.ISSUING.totalQuantity, 15);
  assert.equal(breakdown.TRANSFER_IN.count, 1);
  assert.equal(breakdown.TRANSFER_OUT.count, 1);
  assert.equal(breakdown.ADJUSTMENT.count, 1);
});
