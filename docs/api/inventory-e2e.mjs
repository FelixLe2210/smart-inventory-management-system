#!/usr/bin/env node
/**
 * Sprint4-16 – Inventory End-to-End test: Product -> Warehouse -> Inventory
 * Chạy với backend THẬT (SQL Server) đang bật:
 *
 *   node docs/api/inventory-e2e.mjs
 *
 * Biến môi trường (tùy chọn):
 *   API_BASE   (mặc định http://localhost:8080/api)
 *   E2E_USER   (mặc định admin)      E2E_PASS (mặc định Admin@123)
 *
 * Yêu cầu Node >= 18 (có fetch). Script tự dọn dữ liệu test khi xong:
 * đưa tồn về 0 -> xóa product (bản ghi tồn cascade theo FK) -> xóa warehouse -> xóa category.
 */
const API = process.env.API_BASE || 'http://localhost:8080/api';
const USER = process.env.E2E_USER || 'admin';
const PASS = process.env.E2E_PASS || 'Admin@123';

let token = '';
let passed = 0;
let failed = 0;
const cleanup = [];

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* body rỗng */ }
  return { status: res.status, json, data: json?.data, code: json?.error?.code };
}

function check(name, condition, extra = '') {
  if (condition) { passed++; console.log(`  ✔ ${name}`); }
  else { failed++; console.error(`  ✘ ${name} ${extra}`); }
}

async function must(name, promise, expectedStatus) {
  const r = await promise;
  check(`${name} -> HTTP ${expectedStatus}`, r.status === expectedStatus,
        `(nhận ${r.status}: ${JSON.stringify(r.json?.error || r.json)})`);
  if (r.status !== expectedStatus) throw new Error(`Dừng: bước "${name}" thất bại`);
  return r;
}

const adjust = (id, adjustmentType, quantity) =>
  call('POST', `/inventories/${id}/adjust`, { adjustmentType, quantity, reason: 'E2E', referenceDoc: 'E2E-DOC' });

async function main() {
  const sfx = Date.now().toString(36).toUpperCase();
  console.log(`API: ${API}  | suffix: ${sfx}\n`);

  console.log('1. Đăng nhập');
  const login = await must('login', call('POST', '/auth/login', { usernameOrEmail: USER, password: PASS }), 200);
  token = login.data.accessToken;
  check('có accessToken', !!token);

  console.log('\n2. Master Data: Category -> Product -> Warehouse');
  const cat = await must('tạo category', call('POST', '/categories', { code: `E2E-CAT-${sfx}`, name: `E2E ${sfx}` }), 201);
  cleanup.unshift(() => call('DELETE', `/categories/${cat.data.id}`));

  const productBody = (sku, min, max) => ({
    sku, barcode: `893${Date.now()}${Math.floor(Math.random() * 90 + 10)}`, name: `Sản phẩm ${sku}`, categoryId: cat.data.id,
    unit: 'Cái', purchasePrice: 1000, sellingPrice: 1500, minStockLevel: min, maxStockLevel: max, status: 'ACTIVE',
  });
  const prod = await must('tạo product (Min=10, Max=100)', call('POST', '/products', productBody(`E2E-${sfx}`, 10, 100)), 201);
  cleanup.unshift(() => call('DELETE', `/products/${prod.data.id}`));

  const wh = await must('tạo warehouse', call('POST', '/warehouses', {
    code: `E2E-${sfx}`, name: `Kho E2E ${sfx}`, address: 'KCN Test, TP.HCM',
    region: 'south', type: 'standard', capacity: 1000, barcodeEnabled: true, status: 'ACTIVE',
  }), 201);
  cleanup.unshift(() => call('DELETE', `/warehouses/${wh.data.id}`));

  console.log('\n3. Inventory: khai báo tồn và trạng thái');
  const inv = await must('khai báo tồn ban đầu 50, giữ chỗ 5', call('POST', '/inventories', {
    productId: prod.data.id, warehouseId: wh.data.id, initialStock: 50, reservedStock: 5, locationInWarehouse: 'A1-01',
  }), 201);
  const invId = inv.data.id;
  cleanup.unshift(async () => { await adjust(invId, 'RELEASE', 5); await adjust(invId, 'SET', 0); });
  check('status = IN_STOCK', inv.data.stockStatus === 'IN_STOCK');
  check('availableStock = 45', inv.data.availableStock === 45);
  check('trả về thông tin product & warehouse', inv.data.productSku === `E2E-${sfx}` && inv.data.warehouseCode === `E2E-${sfx}`);

  console.log('\n4. Trạng thái đổi theo tồn (In / Low / Out / Over)');
  let r = await must('SET tồn = 10 (bằng Min)', adjust(invId, 'SET', 10), 200);
  check('status = LOW_STOCK', r.data.stockStatus === 'LOW_STOCK');
  r = await must('RELEASE 5 (nhả giữ chỗ)', adjust(invId, 'RELEASE', 5), 200);
  r = await must('SET tồn = 0', adjust(invId, 'SET', 0), 200);
  check('status = OUT_OF_STOCK', r.data.stockStatus === 'OUT_OF_STOCK');
  r = await must('IN 150 (> Max 100)', adjust(invId, 'IN', 150), 200);
  check('status = OVER_STOCK', r.data.stockStatus === 'OVER_STOCK');
  r = await must('SET tồn = 50', adjust(invId, 'SET', 50), 200);
  check('status = IN_STOCK', r.data.stockStatus === 'IN_STOCK');

  console.log('\n5. Quy tắc giữ chỗ / xuất kho');
  r = await must('RESERVE 20', adjust(invId, 'RESERVE', 20), 200);
  check('availableStock = 30', r.data.availableStock === 30);
  r = await adjust(invId, 'OUT', 40);
  check('OUT vượt khả dụng -> 400 INSUFFICIENT_STOCK', r.status === 400 && r.code === 'INSUFFICIENT_STOCK');
  r = await adjust(invId, 'SET', 10);
  check('SET dưới số giữ chỗ -> 400 INVALID_STOCK', r.status === 400 && r.code === 'INVALID_STOCK');
  await must('RELEASE 20', adjust(invId, 'RELEASE', 20), 200);

  console.log('\n6. Truy vấn / lọc theo kho & sản phẩm');
  r = await must('lọc kho + sản phẩm', call('GET', `/inventories?warehouseId=${wh.data.id}&productId=${prod.data.id}`), 200);
  check('có đúng 1 dòng', r.data.length === 1 && r.data[0].id === invId);
  r = await must('lọc theo kho', call('GET', `/inventories?warehouseId=${wh.data.id}`), 200);
  check('kho có 1 dòng tồn', r.data.length === 1);
  r = await must('lọc theo sản phẩm', call('GET', `/inventories?productId=${prod.data.id}`), 200);
  check('sản phẩm có 1 dòng tồn', r.data.length === 1);
  r = await must('PUT đổi vị trí', call('PUT', `/inventories/${invId}`, { locationInWarehouse: 'B2-02' }), 200);
  check('vị trí đã đổi, tồn không đổi', r.data.locationInWarehouse === 'B2-02' && r.data.currentStock === 50);

  console.log('\n7. Đổi Min ở Master Data -> trạng thái tồn đổi theo');
  await must('sửa product Min = 60', call('PUT', `/products/${prod.data.id}`, productBody(`E2E-${sfx}`, 60, 100)), 200);
  r = await must('đọc lại tồn kho', call('GET', `/inventories/${invId}`), 200);
  check('50 <= Min 60 -> LOW_STOCK', r.data.stockStatus === 'LOW_STOCK');

  console.log('\n8. Ràng buộc liên module');
  r = await call('POST', '/inventories', { productId: prod.data.id, warehouseId: wh.data.id, initialStock: 1 });
  check('trùng cặp Product-Warehouse -> 409 INVENTORY_EXISTS', r.status === 409 && r.code === 'INVENTORY_EXISTS');
  r = await call('POST', '/inventories', { productId: 99999999, warehouseId: wh.data.id, initialStock: 1 });
  check('product không tồn tại -> 404 PRODUCT_NOT_FOUND', r.status === 404 && r.code === 'PRODUCT_NOT_FOUND');
  r = await call('POST', '/inventories', { warehouseId: wh.data.id, initialStock: -1 });
  check('thiếu productId / tồn âm -> 400', r.status === 400);

  r = await call('DELETE', `/warehouses/${wh.data.id}`);
  check('xóa kho đã có tồn kho -> 409 WAREHOUSE_HAS_INVENTORY', r.status === 409 && r.code === 'WAREHOUSE_HAS_INVENTORY');
  r = await call('DELETE', `/products/${prod.data.id}`);
  check('xóa sản phẩm còn hàng -> 409 PRODUCT_HAS_STOCK', r.status === 409 && r.code === 'PRODUCT_HAS_STOCK');

  const prod2 = await must('tạo product thứ 2', call('POST', '/products', productBody(`E2E2-${sfx}`, 5, 100)), 201);
  cleanup.unshift(() => call('DELETE', `/products/${prod2.data.id}`));
  await must('chuyển kho sang MAINTENANCE', call('PATCH', `/warehouses/${wh.data.id}/status`, { status: 'MAINTENANCE' }), 200);
  r = await call('POST', '/inventories', { productId: prod2.data.id, warehouseId: wh.data.id, initialStock: 1 });
  check('nhập tồn vào kho bảo trì -> 400 WAREHOUSE_NOT_ACTIVE', r.status === 400 && r.code === 'WAREHOUSE_NOT_ACTIVE');
  r = await adjust(invId, 'IN', 1);
  check('điều chỉnh tồn ở kho bảo trì -> 400 WAREHOUSE_NOT_ACTIVE', r.status === 400 && r.code === 'WAREHOUSE_NOT_ACTIVE');
  // Trả kho về ACTIVE để bước dọn dẹp điều chỉnh được tồn về 0
  await call('PATCH', `/warehouses/${wh.data.id}/status`, { status: 'ACTIVE' });
}

main()
  .catch((e) => { failed++; console.error(`\n${e.message}`); })
  .finally(async () => {
    console.log('\nDọn dữ liệu test...');
    for (const fn of cleanup) { try { await fn(); } catch { /* bỏ qua */ } }
    console.log(`\nKết quả: ${passed} đạt, ${failed} lỗi`);
    process.exit(failed ? 1 : 0);
  });
