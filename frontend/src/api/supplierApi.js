import { httpClient } from './httpClient';

export const supplierApi = {
  async getAll() {
    const res = await httpClient.get('/suppliers');
    return res.data;
  },

  async getById(id) {
    const res = await httpClient.get(`/suppliers/${id}`);
    return res.data;
  },

  async create(data) {
    const res = await httpClient.post('/suppliers', data);
    return res.data;
  },

  async update(id, data) {
    const res = await httpClient.put(`/suppliers/${id}`, data);
    return res.data;
  },

  async delete(id) {
    const res = await httpClient.delete(`/suppliers/${id}`);
    return res.data;
  },
};
