// Kiểm thử nhiều client WebSocket trên backend thật (cần Node 22+ có WebSocket sẵn).
//   node docs/api/realtime-e2e.mjs
import { api, login, check, finish, BASE } from './_e2e-common.mjs';

if (typeof WebSocket === 'undefined') {
  console.error('Cần Node 22+ (có WebSocket toàn cục). Cập nhật Node hoặc chạy bằng giao diện web.');
  process.exit(2);
}

const wsBase = BASE.replace(/^http/, 'ws');
const token = await login();

function openClient(url) {
  return new Promise((resolve) => {
    const messages = [];
    const ws = new WebSocket(url);
    ws.onmessage = (e) => { try { messages.push(JSON.parse(e.data)); } catch { /* bỏ qua */ } };
    ws.onopen = () => resolve({ ws, messages, opened: true });
    ws.onerror = () => resolve({ ws, messages, opened: false });
  });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. Xác thực
const bad = await openClient(`${wsBase}/ws/inventory?token=khong-hop-le`);
check('Token sai bị từ chối', bad.opened === false);
const none = await openClient(`${wsBase}/ws/inventory`);
check('Thiếu token bị từ chối', none.opened === false);

// 2. Ba client cùng kết nối
const clients = await Promise.all([1, 2, 3].map(() => openClient(`${wsBase}/ws/inventory?token=${token}`)));
check('3 client kết nối được', clients.every((c) => c.opened));
await wait(300);
check('Mỗi client nhận tin CONNECTED', clients.every((c) => c.messages.some((m) => m.type === 'CONNECTED')));

// 3. Đổi tồn kho -> mọi client nhận cùng sự kiện
const inv = (await api('/api/inventories', { token })).json.data
  .find((i) => i.productSku?.startsWith('SI-') && i.availableStock > (i.minStockLevel ?? 0) + 1 && i.stockStatus === 'IN_STOCK');
if (!inv) throw new Error('Cần một tồn kho mẫu SI-* đang IN_STOCK và nằm trên mức tối thiểu.');
const drop = inv.currentStock - inv.minStockLevel;   // xuống đúng mức tối thiểu => LOW_STOCK
const t0 = Date.now();
const res = await api(`/api/inventories/${inv.id}/adjust`, { method: 'POST', token, body: { adjustmentType: 'OUT', quantity: drop, reason: 'realtime test', referenceDoc: 'RT-1' } });
check('Xuất kho thành công', res.status === 200, `status ${res.status}`);
await wait(500);
for (const [i, c] of clients.entries()) {
  const upd = c.messages.find((m) => m.type === 'INVENTORY_UPDATED' && m.data.inventoryId === inv.id);
  const alert = c.messages.find((m) => m.type === 'STOCK_ALERT' && m.data.inventoryId === inv.id);
  check(`Client ${i + 1} nhận INVENTORY_UPDATED với tồn mới`, !!upd && upd.data.currentStock === inv.currentStock - drop);
  check(`Client ${i + 1} nhận STOCK_ALERT LOW_STOCK`, !!alert && alert.data.stockStatus === 'LOW_STOCK');
}
console.log(`      độ trễ từ lúc gọi API đến khi kiểm tra: ~${Date.now() - t0} ms (đã chờ 500 ms)`);

// 4. Thao tác lỗi không phát sự kiện
const before = clients[0].messages.length;
await api(`/api/inventories/${inv.id}/adjust`, { method: 'POST', token, body: { adjustmentType: 'OUT', quantity: 999999, reason: 'phải lỗi' } });
await wait(300);
check('Thao tác bị từ chối không phát sự kiện', clients[0].messages.length === before);

// 5. Một client đóng đột ngột, các client còn lại vẫn nhận tin
clients[0].ws.close();
await wait(200);
await api(`/api/inventories/${inv.id}/adjust`, { method: 'POST', token, body: { adjustmentType: 'IN', quantity: drop, reason: 'realtime test cleanup', referenceDoc: 'RT-2' } });
await wait(500);
check('Client còn lại vẫn nhận tin sau khi một client đóng', clients[1].messages.some((m) => m.type === 'INVENTORY_UPDATED' && m.data.currentStock === inv.currentStock));

clients.forEach((c) => c.ws.close());
console.log('\nĐã trả tồn kho về mức ban đầu.');
finish();
