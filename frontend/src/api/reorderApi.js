import { httpClient } from './httpClient';

/** Đề xuất đặt hàng (AI #2) - backend: /api/reorder/... */
export const reorderApi = {
  async list(status) {
    const res = await httpClient.get('/reorder/recommendations', { params: status ? { status } : {} });
    return res.data;
  },

  async getById(id) {
    const res = await httpClient.get(`/reorder/recommendations/${id}`);
    return res.data;
  },

  /** Tính lại đề xuất bằng AI; gọi AI service nên cho phép chờ lâu hơn. */
  async generate({ productId, warehouseId } = {}) {
    const body = {};
    if (productId) body.productId = Number(productId);
    if (warehouseId) body.warehouseId = Number(warehouseId);
    const res = await httpClient.post('/reorder/recommendations/generate', body, { timeout: 120000 });
    return res.data;
  },

  /** Chấp nhận đề xuất -> backend tạo Purchase Order DRAFT và trả về PO đó. */
  async accept(id, quantity) {
    const body = quantity ? { quantity: Number(quantity) } : {};
    const res = await httpClient.post(`/reorder/recommendations/${id}/accept`, body);
    return res.data;
  },

  async reject(id) {
    const res = await httpClient.post(`/reorder/recommendations/${id}/reject`);
    return res.data;
  },
};
