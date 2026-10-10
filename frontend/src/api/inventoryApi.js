import { httpClient } from './httpClient';

/** Bỏ các tham số rỗng / "all" để không gửi lên query string. */
function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all'
    )
  );
}

export const inventoryApi = {
  /**
   * Danh sách tồn kho (backend lọc theo kho / sản phẩm).
   * Lọc theo trạng thái tồn được thực hiện ở frontend (xem useInventory).
   * @param {{warehouseId?: number|string, productId?: number|string}} params
   * @returns {Promise<Array>}
   */
  async getAll(params = {}) {
    const res = await httpClient.get('/inventories', { params: cleanParams(params) });
    return res.data;
  },

  async getById(id) {
    const res = await httpClient.get(`/inventories/${id}`);
    return res.data;
  },

  /**
   * Khai báo tồn kho của sản phẩm tại kho.
   * @param {{productId:number, warehouseId:number, initialStock?:number, reservedStock?:number, locationInWarehouse?:string}} data
   */
  async create(data) {
    const res = await httpClient.post('/inventories', data);
    return res.data;
  },

  /**
   * Cập nhật vị trí lưu kho / thời điểm kiểm kê (không đổi số lượng).
   * @param {{locationInWarehouse?:string, lastStockCountAt?:string}} data
   */
  async update(id, data) {
    const res = await httpClient.put(`/inventories/${id}`, data);
    return res.data;
  },

  /**
   * Điều chỉnh số lượng: IN | OUT | SET | RESERVE | RELEASE.
   * @param {{adjustmentType:string, quantity:number, reason?:string, referenceDoc?:string}} data
   */
  async adjust(id, data) {
    const res = await httpClient.post(`/inventories/${id}/adjust`, data);
    return res.data;
  },
};
