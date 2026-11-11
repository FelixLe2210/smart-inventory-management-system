import { getCurrentUser } from '../api/httpClient';
import { canManageCatalog, canManageUsers, canOperateStock } from './permissionsLogic.js';

export { canManageCatalog, canManageUsers, canOperateStock, normalizeRoles } from './permissionsLogic.js';

export function useCanManage() {
  return canManageCatalog(getCurrentUser());
}

export function useCanOperate() {
  return canOperateStock(getCurrentUser());
}
