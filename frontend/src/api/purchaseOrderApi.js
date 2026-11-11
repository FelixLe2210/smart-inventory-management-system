import { httpClient } from './httpClient';

/** Purchase Order - backend: /api/purchase-orders */
export const purchaseOrderApi = {
  async search({ status, supplierId, warehouseId } = {}) {
    const params = {};
    if (status) params.status = status;
    if (supplierId) params.supplierId = supplierId;
    if (warehouseId) params.warehouseId = warehouseId;
    const res = await httpClient.get('/purchase-orders', { params });
    return res.data;
  },

  async getById(id) {
    const res = await httpClient.get(`/purchase-orders/${id}`);
    return res.data;
  },

  async create(payload) {
    const res = await httpClient.post('/purchase-orders', payload);
    return res.data;
  },

  async update(id, payload) {
    const res = await httpClient.put(`/purchase-orders/${id}`, payload);
    return res.data;
  },

  async remove(id) {
    const res = await httpClient.delete(`/purchase-orders/${id}`);
    return res.data;
  },

  async send(id) {
    const res = await httpClient.post(`/purchase-orders/${id}/send`);
    return res.data;
  },

  async cancel(id) {
    const res = await httpClient.post(`/purchase-orders/${id}/cancel`);
    return res.data;
  },

  /** lines: [{ itemId, quantity }] - cộng tồn kho ngay trong cùng giao dịch ở backend. */
  async receive(id, { lines, note }) {
    const res = await httpClient.post(`/purchase-orders/${id}/receive`, { lines, note: note || null });
    return res.data;
  },
};
