import { httpClient } from './httpClient';

/** Quản lý tài khoản (chỉ ADMIN). */
export const userApi = {
  async getAll() {
    const res = await httpClient.get('/users');
    return res.data;
  },

  async changeRole(id, role) {
    const res = await httpClient.patch(`/users/${id}/role`, { role });
    return res.data;
  },

  async changeStatus(id, active) {
    const res = await httpClient.patch(`/users/${id}/status`, { active });
    return res.data;
  },
};
