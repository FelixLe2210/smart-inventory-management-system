/** Vai trò khớp với SecurityConfig phía backend: ADMIN, MANAGER, STAFF, VIEWER (chỉ xem). */
export function normalizeRoles(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  return roles.map((r) => String(r).replace(/^ROLE_/, '').toUpperCase());
}

/** ADMIN và MANAGER được sửa danh mục gốc và quyết định mua hàng; STAFF chỉ vận hành kho. */
export function canManageCatalog(user) {
  const roles = normalizeRoles(user);
  return roles.includes('ADMIN') || roles.includes('MANAGER');
}

/** ADMIN, MANAGER và STAFF được nhập, xuất, điều chỉnh, chuyển kho; VIEWER (tài khoản mới đăng ký) chỉ xem. */
export function canOperateStock(user) {
  const roles = normalizeRoles(user);
  return roles.includes('ADMIN') || roles.includes('MANAGER') || roles.includes('STAFF');
}

/** Chỉ ADMIN được xem danh sách tài khoản, đổi vai trò và khóa tài khoản. */
export function canManageUsers(user) {
  return normalizeRoles(user).includes('ADMIN');
}
