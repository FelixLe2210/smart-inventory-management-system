#!/usr/bin/env node
/**
 * Sprint5-16 – Receiving / Issuing / Transfer End-to-End test
 *
 * Chạy với backend THẬT (SQL Server) đang bật:
 *
 *   node docs/api/stock-movement-e2e.mjs
 *
 * Biến môi trường (tùy chọn):
 *   API_BASE   (mặc định http://localhost:8080/api)
 *   E2E_USER   (mặc định admin)      E2E_PASS (mặc định Admin@123)
 *
 * Yêu cầu Node >= 18 (có fetch).
 *
 * Kịch bản: 1 sản phẩm, 3 kho (A, B hoạt động; C bảo trì)
 *   nhập 100 vào A -> xuất 30 -> giữ chỗ 10 -> chuyển A->B (B chưa có dòng tồn)
 *   -> kiểm tra số dư hai kho, tổng tồn, chuỗi số dư trong nhật ký giao dịch, cặp mã -OUT/-IN
 *   -> chuyển ngược B->A -> xuất hết B -> các trường hợp lỗi (tồn không đổi sau lỗi)
 *
 * LƯU Ý: giao dịch kho được ghi vĩnh viễn và sản phẩm/kho có giao dịch không xóa được
 * (khóa ngoại), nên script KHÔNG dọn dữ liệu. Mọi dữ liệu test mang tiền tố "E2E-" kèm hậu tố
 * ngẫu nhiên theo mỗi lần chạy nên chạy lại nhiều lần không bị trùng. Thoát mã 1 nếu có kiểm tra thất bại.
 */
const API = process.env.API_BASE || 'http://localhost:8080/api';
const USER = process.env.E2E_USER || 'admin';
const PASS = process.env.E2E_PASS || 'Admin@123';

let token = '';
let passed = 0;
let failed = 0;

async function call(method, path, body, { auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await res.json(); } catch { /* body rỗng */ }
  return { status: res.status, json, data: json?.data, code: json?.error?.code, details: json?.error?.details };
}

function check(name, condition, extra = '') {
  if (condition) { passed++; console.log(`  ✔ ${name}`); }
  else { failed++; console.error(`  ✘ ${name} ${extra}`); }
}

/** Bước bắt buộc: sai là dừng cả kịch bản vì các bước sau phụ thuộc vào nó. */
async function must(name, promise, expectedStatus) {
  const r = await promise;
  check(`${name} -> HTTP ${expectedStatus}`, r.status === expectedStatus,
        `(nhận ${r.status}: ${JSON.stringify(r.json?.error || r.json)})`);
  if (r.status !== expectedStatus) throw new Error(`Dừng: bước "${name}" thất bại`);
  return r;
}

/** Kiểm tra một lệnh bị từ chối đúng HTTP status và mã lỗi (mã có thể là một trong nhiều mã chấp nhận được). */
async function rejected(name, promise, status, codes) {
  const r = await promise;
  const list = Array.isArray(codes) ? codes : [codes];
  check(`${name} -> ${status} ${list.join('|')}`, r.status === status && list.includes(r.code),
        `(nhận ${r.status} ${r.code}: ${r.json?.error?.message || ''})`);
  return r;
}

const adjust = (id, adjustmentType, quantity, referenceDoc = 'E2E-DOC') =>
  call('POST', `/inventories/${id}/adjust`, { adjustmentType, quantity, reason: 'E2E', referenceDoc });
const transfer = (id, destinationWarehouseId, quantity, extra = {}) =>
  call('POST', `/inventories/${id}/transfer`, { destinationWarehouseId, quantity, reason: 'E2E chuyển kho', referenceDoc: 'E2E-TRF', ...extra });
const getInv = async (id) => (await call('GET', `/inventories/${id}`)).data;
const byId = (a, b) => a.id - b.id;

/** Chuỗi số dư phải liền mạch: balanceAfter của giao dịch trước = balanceBefore của giao dịch sau. */
function balanceChainIsContinuous(txs) {
  const sorted = [...txs].sort(byId);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].balanceBefore !== sorted[i - 1].balanceAfter) return false;
  }
  return true;
}

async function main() {
  const sfx = Date.now().toString(36).toUpperCase();
  console.log(`API: ${API}  | suffix: ${sfx}\n`);

  console.log('1. Đăng nhập');
  const login = await must('login', call('POST', '/auth/login', { usernameOrEmail: USER, password: PASS }, { auth: false }), 200);
  token = login.data.accessToken;
  check('có accessToken', !!token);

  console.log('\n2. Dựng dữ liệu: Category, Product, kho A / B / C');
  const cat = await must('tạo category', call('POST', '/categories', { code: `E2E-CAT-${sfx}`, name: `E2E ${sfx}` }), 201);
  const prod = await must('tạo product', call('POST', '/products', {
    sku: `E2E-${sfx}`, barcode: `893${Date.now()}${Math.floor(Math.random() * 90 + 10)}`, name: `Sản phẩm E2E ${sfx}`,
    categoryId: cat.data.id, unit: 'Cái', purchasePrice: 1000, sellingPrice: 1500, minStockLevel: 10, maxStockLevel: 1000, status: 'ACTIVE',
  }), 201);
  const mkWh = (tag) => call('POST', '/warehouses', {
    code: `E2E-${tag}-${sfx}`, name: `Kho ${tag} ${sfx}`, address: 'KCN Test, TP.HCM',
    region: 'south', type: 'standard', capacity: 1000, barcodeEnabled: true, status: 'ACTIVE',
  });
  const whA = await must('tạo kho A', mkWh('A'), 201);
  const whB = await must('tạo kho B', mkWh('B'), 201);
  const whC = await must('tạo kho C', mkWh('C'), 201);
  await must('đưa kho C sang MAINTENANCE', call('PATCH', `/warehouses/${whC.data.id}/status`, { status: 'MAINTENANCE' }), 200);

  const invA = await must('tạo dòng tồn tại A (tồn đầu 0)', call('POST', '/inventories', {
    productId: prod.data.id, warehouseId: whA.data.id, initialStock: 0, locationInWarehouse: 'A-01',
  }), 201);
  const idA = invA.data.id;
  check('dòng tồn A bắt đầu từ 0', invA.data.currentStock === 0);

  console.log('\n3. Nhập kho (RECEIVING) và xuất kho (ISSUING) tại A');
  let r = await must('nhập 100', adjust(idA, 'IN', 100, 'E2E-PO'), 200);
  check('A = 100 sau khi nhập', r.data.currentStock === 100);
  r = await must('xuất 30', adjust(idA, 'OUT', 30, 'E2E-SO'), 200);
  check('A = 70 sau khi xuất', r.data.currentStock === 70);
  await rejected('xuất vượt tồn (500)', adjust(idA, 'OUT', 500), 400, 'INSUFFICIENT_STOCK');
  check('A vẫn = 70 sau lệnh xuất bị từ chối', (await getInv(idA)).currentStock === 70);

  console.log('\n4. Giữ chỗ làm giảm tồn khả dụng cho việc chuyển kho');
  r = await must('giữ chỗ 10', adjust(idA, 'RESERVE', 10), 200);
  check('A: tồn 70, giữ chỗ 10, khả dụng 60', r.data.currentStock === 70 && r.data.reservedStock === 10 && r.data.availableStock === 60);
  await rejected('chuyển 65 (lớn hơn khả dụng 60, nhỏ hơn tồn 70)', transfer(idA, whB.data.id, 65), 400, 'INSUFFICIENT_STOCK');
  await must('thả giữ chỗ 10', adjust(idA, 'RELEASE', 10), 200);
  check('A: khả dụng trở lại 70', (await getInv(idA)).availableStock === 70);

  console.log('\n5. Chuyển kho A -> B (kho B chưa có dòng tồn)');
  const beforeList = (await call('GET', `/inventories?productId=${prod.data.id}`)).data;
  check('trước chuyển: sản phẩm chỉ có 1 dòng tồn (A)', beforeList.length === 1);
  r = await must('chuyển 20 từ A sang B', transfer(idA, whB.data.id, 20), 200);
  check('phản hồi là dòng tồn của kho ĐÍCH (B) = 20', r.data.warehouseId === whB.data.id && r.data.currentStock === 20);
  const idB = r.data.id;
  check('A = 50', (await getInv(idA)).currentStock === 50);
  check('B = 20', (await getInv(idB)).currentStock === 20);
  const afterList = (await call('GET', `/inventories?productId=${prod.data.id}`)).data;
  check('sau chuyển: sản phẩm có 2 dòng tồn (A, B)', afterList.length === 2);
  check('tổng tồn hai kho không đổi (70)', afterList.reduce((s, i) => s + i.currentStock, 0) === 70);

  console.log('\n6. Nhật ký giao dịch');
  const txA = (await call('GET', `/inventories/${idA}/transactions`)).data;
  const txB = (await call('GET', `/inventories/${idB}/transactions`)).data;
  const find = (txs, type) => txs.find((t) => t.transactionType === type);
  const recv = find(txA, 'RECEIVING');
  check('A có RECEIVING 100 (0 -> 100), chứng từ E2E-PO',
        !!recv && recv.quantity === 100 && recv.balanceBefore === 0 && recv.balanceAfter === 100 && recv.referenceDoc === 'E2E-PO');
  const issu = find(txA, 'ISSUING');
  check('A có ISSUING 30 (100 -> 70), chứng từ E2E-SO',
        !!issu && issu.quantity === 30 && issu.balanceBefore === 100 && issu.balanceAfter === 70 && issu.referenceDoc === 'E2E-SO');
  const tOut = find(txA, 'TRANSFER_OUT');
  check('A có TRANSFER_OUT 20 (70 -> 50)', !!tOut && tOut.quantity === 20 && tOut.balanceBefore === 70 && tOut.balanceAfter === 50);
  const tIn = find(txB, 'TRANSFER_IN');
  check('B có TRANSFER_IN 20 (0 -> 20)', !!tIn && tIn.quantity === 20 && tIn.balanceBefore === 0 && tIn.balanceAfter === 20);
  check('mỗi dòng tồn chỉ thấy đúng phía của mình (A không có IN, B không có OUT)',
        !find(txA, 'TRANSFER_IN') && !find(txB, 'TRANSFER_OUT'));
  check('cặp mã giao dịch cùng gốc: TXN-...-OUT / TXN-...-IN',
        !!tOut && !!tIn && tOut.transactionCode.endsWith('-OUT') && tIn.transactionCode.endsWith('-IN') &&
        tOut.transactionCode.replace(/-OUT$/, '') === tIn.transactionCode.replace(/-IN$/, ''));
  check('chứng từ và lý do được ghi cho cả hai phía',
        tOut?.referenceDoc === 'E2E-TRF' && tIn?.referenceDoc === 'E2E-TRF' && tOut?.reason === 'E2E chuyển kho');
  check('chuỗi số dư kho A liền mạch', balanceChainIsContinuous(txA));
  check('chuỗi số dư kho B liền mạch', balanceChainIsContinuous(txB));

  console.log('\n7. Các trường hợp lỗi khi chuyển kho (tồn phải KHÔNG đổi sau mỗi lỗi)');
  await rejected('cùng kho nguồn và đích', transfer(idA, whA.data.id, 5), 400, 'SAME_WAREHOUSE_TRANSFER');
  await rejected('số lượng = 0', transfer(idA, whB.data.id, 0), 400, 'VALIDATION_ERROR');
  await rejected('số lượng âm', transfer(idA, whB.data.id, -3), 400, 'VALIDATION_ERROR');
  const noDest = await rejected('thiếu kho đích', call('POST', `/inventories/${idA}/transfer`, { quantity: 5 }), 400, 'VALIDATION_ERROR');
  check('VALIDATION_ERROR có details theo từng ô', Array.isArray(noDest.details) && noDest.details.some((d) => d.startsWith('destinationWarehouseId')));
  await rejected('chuyển vượt khả dụng (51 > 50)', transfer(idA, whB.data.id, 51), 400, 'INSUFFICIENT_STOCK');
  await rejected('kho đích không tồn tại', transfer(idA, 999999999, 5), 404, 'WAREHOUSE_NOT_FOUND');
  await rejected('dòng tồn nguồn không tồn tại', transfer(999999999, whB.data.id, 5), 404, 'INVENTORY_NOT_FOUND');
  await rejected('kho đích đang bảo trì (C)', transfer(idA, whC.data.id, 5), 400, 'WAREHOUSE_NOT_ACTIVE');
  const noAuth = await call('POST', `/inventories/${idA}/transfer`, { destinationWarehouseId: whB.data.id, quantity: 5 }, { auth: false });
  check('không có token -> HTTP 401', noAuth.status === 401, `(nhận ${noAuth.status})`);
  check('A vẫn = 50 sau mọi lỗi', (await getInv(idA)).currentStock === 50);
  check('B vẫn = 20 sau mọi lỗi', (await getInv(idB)).currentStock === 20);
  check('không có dòng tồn nào bị tạo ở kho C', ((await call('GET', `/inventories?productId=${prod.data.id}&warehouseId=${whC.data.id}`)).data || []).length === 0);
  check('các lệnh bị từ chối không ghi thêm giao dịch nào vào nhật ký kho A',
        (await call('GET', `/inventories/${idA}/transactions`)).data.length === txA.length);

  console.log('\n8. Chuyển ngược B -> A, xuất hết B');
  r = await must('chuyển 5 từ B về A', transfer(idB, whA.data.id, 5, { referenceDoc: 'E2E-BACK' }), 200);
  check('phản hồi là dòng tồn của A = 55', r.data.id === idA && r.data.currentStock === 55);
  check('B = 15', (await getInv(idB)).currentStock === 15);
  await must('xuất hết 15 tại B', adjust(idB, 'OUT', 15), 200);
  check('B = 0', (await getInv(idB)).currentStock === 0);
  await rejected('chuyển từ B khi khả dụng = 0', transfer(idB, whA.data.id, 1), 400, 'INSUFFICIENT_STOCK');

  console.log('\n9. Đối soát cuối: bảo toàn số lượng');
  const finalList = (await call('GET', `/inventories?productId=${prod.data.id}`)).data;
  const total = finalList.reduce((s, i) => s + i.currentStock, 0);
  check('tổng tồn = nhập 100 - xuất 30 - xuất 15 = 55', total === 55, `(thực tế ${total})`);
  const allA = (await call('GET', `/inventories/${idA}/transactions`)).data;
  const allB = (await call('GET', `/inventories/${idB}/transactions`)).data;
  check('chuỗi số dư A liền mạch sau toàn bộ kịch bản', balanceChainIsContinuous(allA));
  check('chuỗi số dư B liền mạch sau toàn bộ kịch bản', balanceChainIsContinuous(allB));
  check('số dư cuối trong nhật ký khớp tồn thật (A)', [...allA].sort(byId).at(-1).balanceAfter === 55);
  check('số dư cuối trong nhật ký khớp tồn thật (B)', [...allB].sort(byId).at(-1).balanceAfter === 0);

  console.log(`\nKết quả: ${passed} đạt, ${failed} lỗi.`);
  console.log(`(Dữ liệu test mang tiền tố E2E-, hậu tố ${sfx}, được giữ lại vì đã có giao dịch kho.)`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`\n✘ ${err.message}`);
  console.log(`Kết quả: ${passed} đạt, ${failed + 1} lỗi.`);
  process.exit(1);
});
