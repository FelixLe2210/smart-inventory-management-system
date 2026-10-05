import { httpClient } from './httpClient';

export const productApi = {
  async getAll() {
    const res = await httpClient.get('/products');
    return res.data;
  },

  async getById(id) {
    const res = await httpClient.get(`/products/${id}`);
    return res.data;
  },

  async create(data) {
    const res = await httpClient.post('/products', data);
    return res.data;
  },

  async update(id, data) {
    const res = await httpClient.put(`/products/${id}`, data);
    return res.data;
  },

  async delete(id) {
    const res = await httpClient.delete(`/products/${id}`);
    return res.data;
  },
};
