/**
 * Tiện ích thuần cho Đề xuất đặt hàng và Purchase Order.
 * Không gọi API / không dùng React để kiểm thử được bằng `node --test`.
 */

export const URGENCY = {
  CRITICAL: { label: 'Khẩn cấp', rank: 3, badge: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-600' },
  HIGH: { label: 'Cao', rank: 2, badge: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  MEDIUM: { label: 'Trung bình', rank: 1, badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  LOW: { label: 'Thấp', rank: 0, badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-600' },
};

export const RISK = {
  HIGH: { label: 'Rủi ro cao', badge: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-600' },
  MEDIUM: { label: 'Rủi ro vừa', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  LOW: { label: 'Rủi ro thấp', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-600' },
};

export const ACTION = {
  REORDER: { label: 'Đặt thêm hàng', icon: 'shopping_cart' },
  EXPEDITE_INCOMING: { label: 'Giục hàng đang về', icon: 'local_shipping' },
};

export const RECOMMENDATION_STATUS = {
  PENDING: { label: 'Chờ xử lý', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  ACCEPTED: { label: 'Đã tạo đơn', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  MODIFIED: { label: 'Đã chỉnh & tạo đơn', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Đã bỏ qua', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export const PO_STATUS = {
  DRAFT: { label: 'Nháp', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  SENT: { label: 'Đã gửi', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  PARTIALLY_RECEIVED: { label: 'Nhận một phần', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  RECEIVED: { label: 'Đã nhận đủ', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'Đã hủy', badge: 'bg-red-50 text-red-700 border-red-200' },
};

export const PO_STATUS_KEYS = ['DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'];

export const urgencyConfig = (level) => URGENCY[level] || URGENCY.LOW;
export const riskConfig = (level) => RISK[level] || RISK.LOW;
export const poStatusConfig = (status) => PO_STATUS[status] || PO_STATUS.DRAFT;
export const recommendationStatusConfig = (status) => RECOMMENDATION_STATUS[status] || RECOMMENDATION_STATUS.PENDING;

/** 0.9123 -> "91%". */
export function formatProbability(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(Math.min(1, Math.max(0, n)) * 100)}%`;
}

/** Khẩn cấp trước, rồi xác suất thiếu hàng cao trước, rồi mã tăng dần (ổn định). */
export function sortRecommendations(list = []) {
  return [...list].sort((a, b) => {
    const byUrgency = urgencyConfig(b.urgencyLevel).rank - urgencyConfig(a.urgencyLevel).rank;
    if (byUrgency !== 0) return byUrgency;
    const byProbability = (Number(b.stockoutProbability) || 0) - (Number(a.stockoutProbability) || 0);
    if (byProbability !== 0) return byProbability;
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });
}

export function summarizeRecommendations(list = []) {
  const pending = list.filter((r) => r.status === 'PENDING');
  return {
    total: list.length,
    pending: pending.length,
    critical: pending.filter((r) => r.urgencyLevel === 'CRITICAL').length,
    high: pending.filter((r) => r.urgencyLevel === 'HIGH').length,
    expedite: pending.filter((r) => r.action === 'EXPEDITE_INCOMING').length,
  };
}

/**
 * Lịch sử bán chưa đủ 14 ngày: AI chỉ dùng trung bình đơn giản (short_history) hoặc coi nhu cầu = 0
 * (insufficient_history) -> phải cảnh báo người dùng. `provided` = đủ dữ liệu để dùng mô hình AI.
 */
export function isPlaceholderForecast(rec) {
  const source = rec?.details?.history_source;
  return !!source && source !== 'provided';
}

/** Hành động cho phép theo trạng thái PO (khớp quy tắc ở PurchaseOrderService). */
export function poActions(status) {
  return {
    canEdit: status === 'DRAFT',
    canDelete: status === 'DRAFT',
    canSend: status === 'DRAFT',
    canCancel: status === 'DRAFT' || status === 'SENT',
    canReceive: status === 'SENT' || status === 'PARTIALLY_RECEIVED',
  };
}

/** Phần trăm đã nhận (0-100) theo tổng số lượng. */
export function poProgress(po) {
  const items = po?.items || [];
  const ordered = items.reduce((s, i) => s + (Number(i.orderedQty) || 0), 0);
  if (ordered <= 0) return 0;
  const received = items.reduce((s, i) => s + (Number(i.receivedQty) || 0), 0);
  return Math.min(100, Math.round((received / ordered) * 100));
}

export function todayIso(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Kiểm tra form tạo/sửa PO phía client (backend vẫn kiểm tra lại).
 * @returns {string[]} danh sách lỗi; rỗng = hợp lệ.
 */
export function validatePoForm(form, today = todayIso()) {
  const errors = [];
  if (!form?.supplierId) errors.push('Chọn nhà cung cấp.');
  if (!form?.destinationWarehouseId) errors.push('Chọn kho nhận hàng.');
  if (form?.expectedDeliveryDate && form.expectedDeliveryDate < today) {
    errors.push('Ngày giao dự kiến không được ở quá khứ.');
  }
  const items = form?.items || [];
  if (items.length === 0) errors.push('Thêm ít nhất một sản phẩm.');
  const seen = new Set();
  items.forEach((item, index) => {
    const row = `Dòng ${index + 1}`;
    if (!item.productId) {
      errors.push(`${row}: chọn sản phẩm.`);
    } else if (seen.has(String(item.productId))) {
      errors.push(`${row}: sản phẩm bị lặp.`);
    } else {
      seen.add(String(item.productId));
    }
    const qty = Number(item.orderedQty);
    if (!Number.isInteger(qty) || qty <= 0) errors.push(`${row}: số lượng phải là số nguyên lớn hơn 0.`);
    if (item.unitPrice !== '' && item.unitPrice != null && !(Number(item.unitPrice) >= 0)) {
      errors.push(`${row}: đơn giá không hợp lệ.`);
    }
  });
  return errors;
}

/** Form -> payload gửi backend (giá trống = để backend lấy giá nhập của sản phẩm). */
export function buildPoPayload(form) {
  return {
    supplierId: Number(form.supplierId),
    destinationWarehouseId: Number(form.destinationWarehouseId),
    expectedDeliveryDate: form.expectedDeliveryDate || null,
    note: form.note?.trim() || null,
    items: (form.items || []).map((item) => ({
      productId: Number(item.productId),
      orderedQty: Number(item.orderedQty),
      unitPrice: item.unitPrice === '' || item.unitPrice == null ? null : Number(item.unitPrice),
    })),
  };
}

export function poToForm(po) {
  return {
    supplierId: po?.supplierId ?? '',
    destinationWarehouseId: po?.warehouseId ?? '',
    expectedDeliveryDate: po?.expectedDeliveryDate ?? '',
    note: po?.note ?? '',
    items: (po?.items || []).map((i) => ({
      productId: i.productId,
      orderedQty: i.orderedQty,
      unitPrice: i.unitPrice,
    })),
  };
}

/**
 * Kiểm tra số lượng nhận hàng theo từng dòng; chỉ gửi các dòng > 0.
 * @param {object} po
 * @param {Record<string|number, string|number>} quantities itemId -> số lượng nhập
 */
export function buildReceiveLines(po, quantities = {}) {
  const errors = [];
  const lines = [];
  for (const item of po?.items || []) {
    const raw = quantities[item.id];
    if (raw === '' || raw == null) continue;
    const qty = Number(raw);
    const label = item.productSku || `#${item.id}`;
    if (!Number.isInteger(qty) || qty < 0) {
      errors.push(`${label}: số lượng nhận phải là số nguyên không âm.`);
    } else if (qty > item.remainingQty) {
      errors.push(`${label}: chỉ còn ${item.remainingQty} chưa nhận, không thể nhận ${qty}.`);
    } else if (qty > 0) {
      lines.push({ itemId: item.id, quantity: qty });
    }
  }
  if (errors.length === 0 && lines.length === 0) errors.push('Nhập số lượng nhận cho ít nhất một dòng.');
  return { lines, errors };
}
