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

  /**
   * Nhập kho (Receiving) - bọc quanh adjustType = IN
   * @param {number|string} id Inventory ID
   * @param {{quantity:number, reason?:string, referenceDoc?:string}} data
   */
  async receive(id, data) {
    return this.adjust(id, { ...data, adjustmentType: 'IN' });
  },

  /**
   * Xuất kho (Issuing) - bọc quanh adjustType = OUT
   * @param {number|string} id Inventory ID
   * @param {{quantity:number, reason?:string, referenceDoc?:string}} data
   */
  async issue(id, data) {
    return this.adjust(id, { ...data, adjustmentType: 'OUT' });
  },

  /**
   * Chuyển kho (Transfer): trừ tồn ở dòng tồn nguồn {id} và cộng vào kho đích trong MỘT giao dịch.
   * Backend tự tạo dòng tồn ở kho đích nếu chưa có, và ghi 2 giao dịch TRANSFER_OUT / TRANSFER_IN.
   * Trả về dòng tồn của KHO ĐÍCH sau khi chuyển.
   * @param {number|string} id Inventory ID của kho NGUỒN
   * @param {{destinationWarehouseId:number, quantity:number, reason?:string|null, referenceDoc?:string|null}} data
   */
  async transfer(id, data) {
    const res = await httpClient.post(`/inventories/${id}/transfer`, data);
    return res.data;
  },

  /**
   * Lịch sử giao dịch biến động kho của bản ghi tồn kho
   * @param {number|string} id Inventory ID
   * @returns {Promise<Array>}
   */
  async getTransactions(id) {
    const res = await httpClient.get(`/inventories/${id}/transactions`);
    return res.data;
  },
};
