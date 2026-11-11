// Kiểm tra nhất quán khi nhiều giao dịch đồng thời, chạy trên backend + SQL Server thật.
//   node docs/api/concurrency-check.mjs
// Dùng sản phẩm mẫu SI-*; cuối cùng nhập lại số đã xuất để trả tồn kho về như cũ.
import { api, login, check, finish } from './_e2e-common.mjs';

const token = await login();
const all = (await api('/api/inventories', { token })).json.data;
const samples = all.filter((i) => i.productSku?.startsWith('SI-') && i.availableStock >= 40);
if (samples.length === 0) throw new Error('Không có tồn kho SI-* với tồn khả dụng >= 40. Nạp dữ liệu mẫu trước (xem docs/DATA_GUIDE.md).');
const inv = samples[0];
console.log(`Dùng ${inv.productSku} @ ${inv.warehouseCode}, tồn khả dụng ${inv.availableStock}\n`);

// ── 1. Xuất kho song song vượt tồn: không được âm, số thành công khớp số tồn đã giảm ──
const start = inv.availableStock;
const qty = Math.ceil(start / 8);              // 30 yêu cầu x qty >> tồn
const attempts = 30;
const results = await Promise.all(Array.from({ length: attempts }, (_, i) =>
  api(`/api/inventories/${inv.id}/adjust`, {
    method: 'POST', token,
    body: { adjustmentType: 'OUT', quantity: qty, reason: 'concurrency test', referenceDoc: `CONC-${i}` },
  })));
const ok = results.filter((r) => r.status === 200).length;
const rejected = results.filter((r) => r.status === 400).length;
const serverErrors = results.filter((r) => r.status >= 500).length;
const after = (await api(`/api/inventories/${inv.id}`, { token })).json.data;
check('Không có lỗi 500', serverErrors === 0, `500: ${serverErrors}`);
check('Mọi yêu cầu hoặc thành công hoặc bị từ chối 400', ok + rejected === attempts, `ok=${ok} 400=${rejected}`);
check('Có yêu cầu bị từ chối vì thiếu tồn (đồng thời thật sự xảy ra)', rejected > 0);
check('Tồn không âm', after.currentStock >= 0, `tồn sau = ${after.currentStock}`);
check('Tồn giảm đúng bằng số lần xuất thành công x số lượng', inv.currentStock - after.currentStock === ok * qty,
  `${inv.currentStock} - ${ok}x${qty} = ${inv.currentStock - ok * qty}, thực tế ${after.currentStock}`);

// ── 2. Chuỗi balance trước/sau của lịch sử giao dịch liền mạch ──
const txs = (await api(`/api/inventories/${inv.id}/transactions`, { token })).json.data
  .slice().sort((a, b) => a.id - b.id);
let chainOk = true;
for (let i = 1; i < txs.length; i += 1) {
  if (txs[i].balanceBefore !== undefined && txs[i - 1].balanceAfter !== undefined &&
      txs[i].balanceBefore !== txs[i - 1].balanceAfter) { chainOk = false; break; }
}
check('Chuỗi balance_before/after liền mạch', chainOk, `${txs.length} giao dịch`);

// ── Trả tồn của bước 1 về như ban đầu (nhập lại số đã xuất) ──
const now = (await api(`/api/inventories/${inv.id}`, { token })).json.data;
const diff = inv.currentStock - now.currentStock;
if (diff > 0) await api(`/api/inventories/${inv.id}/adjust`, { method: 'POST', token, body: { adjustmentType: 'IN', quantity: diff, reason: 'concurrency test cleanup', referenceDoc: 'CONC-FIX' } });
else if (diff < 0) await api(`/api/inventories/${inv.id}/adjust`, { method: 'POST', token, body: { adjustmentType: 'OUT', quantity: -diff, reason: 'concurrency test cleanup', referenceDoc: 'CONC-FIX' } });

// ── 3. Chuyển kho hai chiều đồng thời: không deadlock, tổng tồn bảo toàn ──
const others = (await api('/api/warehouses', { token })).json.data.filter((w) => w.id !== inv.warehouseId && w.status === 'ACTIVE');
if (others.length === 0) {
  console.log('SKIP  chuyển kho hai chiều: chỉ có một kho hoạt động');
} else {
  const dest = others[0];
  // Bảo đảm kho đích có bản ghi tồn kho cho sản phẩm này để chuyển ngược lại được.
  await api(`/api/inventories/${inv.id}/transfer`, { method: 'POST', token, body: { destinationWarehouseId: dest.id, quantity: 1, reason: 'seed', referenceDoc: 'CONC-SEED' } });
  const mine = (await api(`/api/inventories?productId=${inv.productId}`, { token })).json.data;
  const a = mine.find((i) => i.warehouseId === inv.warehouseId);
  const b = mine.find((i) => i.warehouseId === dest.id);
  const total0 = a.currentStock + b.currentStock;
  const a0 = inv.currentStock;   // mức ban đầu của kho nguồn
  const moves = await Promise.all([
    ...Array.from({ length: 10 }, (_, i) => api(`/api/inventories/${a.id}/transfer`, { method: 'POST', token, body: { destinationWarehouseId: dest.id, quantity: 1, referenceDoc: `CONC-AB-${i}` } })),
    ...Array.from({ length: 10 }, (_, i) => api(`/api/inventories/${b.id}/transfer`, { method: 'POST', token, body: { destinationWarehouseId: inv.warehouseId, quantity: 1, referenceDoc: `CONC-BA-${i}` } })),
  ]);
  const after2 = (await api(`/api/inventories?productId=${inv.productId}`, { token })).json.data;
  const total1 = after2.filter((i) => i.warehouseId === a.warehouseId || i.warehouseId === b.warehouseId).reduce((s, i) => s + i.currentStock, 0);
  check('Chuyển kho hai chiều: không lỗi 500/deadlock', moves.every((m) => m.status < 500), moves.map((m) => m.status).join(','));
  check('Tổng tồn hai kho được bảo toàn', total0 === total1, `${total0} -> ${total1}`);
  // Dọn dẹp: chuyển phần lệch giữa hai kho để kho nguồn về đúng mức ban đầu (kho đích nhận phần 1 đơn vị seed).
  const aNow = after2.find((i) => i.id === a.id).currentStock;
  const gap = aNow - a0;
  if (gap > 0) await api(`/api/inventories/${a.id}/transfer`, { method: 'POST', token, body: { destinationWarehouseId: dest.id, quantity: gap, referenceDoc: 'CONC-FIX' } });
  if (gap < 0) await api(`/api/inventories/${b.id}/transfer`, { method: 'POST', token, body: { destinationWarehouseId: inv.warehouseId, quantity: -gap, referenceDoc: 'CONC-FIX' } });
}

console.log('\nKho nguồn và kho đích đã về mức ban đầu. Chạy deploy/sample-data/check_data_readiness.sql để xác nhận 8/8 kiểm tra nhất quán.');
finish();
