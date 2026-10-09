import { httpClient } from './httpClient';

export const inventoryApi = {
  async getAll(params = {}) {
    const res = await httpClient.get('/inventories', { params });
    return res.data;
  },

  async getById(id) {
    const res = await httpClient.get(`/inventories/${id}`);
    return res.data;
  },

  async adjust(id, data) {
    const res = await httpClient.post(`/inventories/${id}/adjust`, data);
    return res.data;
  },
};
