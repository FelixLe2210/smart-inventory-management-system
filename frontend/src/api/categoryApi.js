import { httpClient } from './httpClient';

export const categoryApi = {
  async getAll() {
    const res = await httpClient.get('/categories');
    return res.data;
  },

  async getById(id) {
    const res = await httpClient.get(`/categories/${id}`);
    return res.data;
  },

  async create(data) {
    const res = await httpClient.post('/categories', data);
    return res.data;
  },

  async update(id, data) {
    const res = await httpClient.put(`/categories/${id}`, data);
    return res.data;
  },

  async delete(id) {
    const res = await httpClient.delete(`/categories/${id}`);
    return res.data;
  },
};
