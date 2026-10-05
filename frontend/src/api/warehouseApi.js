import { httpClient } from './httpClient';

export const warehouseApi = {
  /**
   * Lấy danh sách tất cả các kho.
   * @returns {Promise<Array>}
   */
  async getAll() {
    const res = await httpClient.get('/warehouses');
    return res.data;
  },

  /**
   * Lấy thông tin chi tiết một kho theo ID.
   * @param {number|string} id
   * @returns {Promise<Object>}
   */
  async getById(id) {
    const res = await httpClient.get(`/warehouses/${id}`);
    return res.data;
  },

  /**
   * Tạo mới kho.
   * @param {Object} data { code, name, address, phone, description, region, type, area, capacity, height, docks, floorLoad, managerName, managerEmail, security, barcodeEnabled, status }
   * @returns {Promise<Object>}
   */
  async create(data) {
    const res = await httpClient.post('/warehouses', data);
    return res.data;
  },

  /**
   * Cập nhật thông tin kho.
   * @param {number|string} id
   * @param {Object} data { code, name, address, phone, description, region, type, area, capacity, height, docks, floorLoad, managerName, managerEmail, security, barcodeEnabled, status }
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    const res = await httpClient.put(`/warehouses/${id}`, data);
    return res.data;
  },

  /**
   * Xóa kho theo ID.
   * @param {number|string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    const res = await httpClient.delete(`/warehouses/${id}`);
    return res.data;
  },

  /**
   * Cập nhật trạng thái kho.
   * @param {number|string} id
   * @param {string} status 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
   * @returns {Promise<Object>}
   */
  async updateStatus(id, status) {
    const res = await httpClient.patch(`/warehouses/${id}/status`, { status });
    return res.data;
  },
};
