/**
 * Logic thuần cho kênh thời gian thực /ws/inventory: dựng URL, tính thời gian chờ kết nối lại,
 * đọc tin nhắn, cập nhật danh sách tồn kho và tạo thông báo. Không phụ thuộc React/trình duyệt nên test bằng node --test.
 */

export const PING_INTERVAL_MS = 25000;
export const MAX_NOTIFICATIONS = 30;

/** ws(s)://host/ws/inventory?token=...  — `override` (VITE_WS_URL) thắng khi có, dùng cho triển khai khác origin. */
export function buildSocketUrl(token, { override, location } = {}) {
  const base =
    override ||
    `${location && location.protocol === 'https:' ? 'wss' : 'ws'}://${location ? location.host : 'localhost:8080'}/ws/inventory`;
  return `${base}?token=${encodeURIComponent(token || '')}`;
}

/** Chờ 1s, 2s, 4s ... tối đa 30s, cộng nhiễu tối đa 20% để nhiều client không kết nối lại cùng lúc. */
export function nextDelay(attempt, random = Math.random) {
  const base = Math.min(30000, 1000 * 2 ** Math.max(0, attempt));
  return Math.round(base + base * 0.2 * random());
}

/** Trả về { type, data } hoặc null nếu không phải JSON hợp lệ. */
export function parseMessage(raw) {
  try {
    const msg = JSON.parse(raw);
    return msg && typeof msg.type === 'string' ? { type: msg.type, data: msg.data ?? null } : null;
  } catch {
    return null;
  }
}

/**
 * Áp một sự kiện INVENTORY_UPDATED lên danh sách tồn kho đang hiển thị.
 * @returns {{rows: Array, found: boolean}} found=false: bản ghi chưa có trong danh sách (mới tạo / ngoài bộ lọc).
 */
export function applyInventoryUpdate(rows, data) {
  if (!Array.isArray(rows) || !data) return { rows, found: false };
  let found = false;
  const next = rows.map((row) => {
    if (row.id !== data.inventoryId) return row;
    found = true;
    return {
      ...row,
      currentStock: data.currentStock,
      reservedStock: data.reservedStock,
      availableStock: data.availableStock,
      stockStatus: data.stockStatus,
      updatedAt: data.occurredAt || row.updatedAt,
    };
  });
  return { rows: found ? next : rows, found };
}

const STATUS_TEXT = {
  LOW_STOCK: 'sắp hết hàng',
  OUT_OF_STOCK: 'đã hết hàng',
};

const PO_TEXT = {
  SENT: 'đã được gửi cho nhà cung cấp',
  CANCELLED: 'đã bị hủy',
  PARTIALLY_RECEIVED: 'đã nhận một phần hàng',
  RECEIVED: 'đã nhận đủ hàng',
};

function poNotification(d, now) {
  const text = PO_TEXT[d.status];
  if (!text) return null; // CREATED/DRAFT không cần thông báo
  return {
    id: `po-${d.poId}-${d.occurredAt || now}`,
    level: d.status === 'CANCELLED' ? 'warning' : 'info',
    title: 'Đơn đặt hàng',
    text: `Đơn ${d.poNumber} ${text}.`,
    inventoryId: null,
    at: d.occurredAt || new Date(now).toISOString(),
    read: false,
  };
}

/** Tin STOCK_ALERT và PO_UPDATED thành thông báo hiển thị; tin khác trả null. */
export function toNotification(msg, now = Date.now()) {
  if (msg && msg.type === 'PO_UPDATED' && msg.data) return poNotification(msg.data, now);
  if (!msg || msg.type !== 'STOCK_ALERT' || !msg.data) return null;
  const d = msg.data;
  const out = d.stockStatus === 'OUT_OF_STOCK';
  return {
    id: `${d.inventoryId}-${d.occurredAt || now}`,
    level: out ? 'error' : 'warning',
    title: out ? 'Hết hàng' : 'Sắp hết hàng',
    text: `${d.productName} (${d.productSku}) tại ${d.warehouseName} ${STATUS_TEXT[d.stockStatus] || ''}: còn ${d.currentStock}.`.replace(' :', ':'),
    inventoryId: d.inventoryId,
    at: d.occurredAt || new Date(now).toISOString(),
    read: false,
  };
}

/** Thông báo mới nhất lên đầu, tối đa `max`; cùng id không thêm lần hai. */
export function addNotification(list, notification, max = MAX_NOTIFICATIONS) {
  if (!notification) return list;
  if (list.some((n) => n.id === notification.id)) return list;
  return [notification, ...list].slice(0, max);
}

export function markAllRead(list) {
  return list.map((n) => (n.read ? n : { ...n, read: true }));
}

export function unreadCount(list) {
  return list.filter((n) => !n.read).length;
}
