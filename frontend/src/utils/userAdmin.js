/** Logic thuần cho màn hình Người dùng và vai trò (không phụ thuộc React để dễ kiểm thử). */

export const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Quản trị', hint: 'Toàn quyền, kể cả quản lý tài khoản' },
  { value: 'MANAGER', label: 'Quản lý', hint: 'Sửa danh mục, quyết định mua hàng, vận hành kho' },
  { value: 'STAFF', label: 'Nhân viên kho', hint: 'Nhập, xuất, chuyển kho và nhận hàng' },
  { value: 'VIEWER', label: 'Chỉ xem', hint: 'Xem dữ liệu và dự báo, không ghi được' },
];

const ROLE_LABEL = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.label]));

/** Tên tiếng Việt của vai trò; vai trò lạ giữ nguyên. */
export function roleLabel(name) {
  return ROLE_LABEL[name] || name || 'Chưa có vai trò';
}

/** Vai trò cao nhất của tài khoản theo thứ tự ADMIN > MANAGER > STAFF > VIEWER. */
export function primaryRole(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const found = ROLE_OPTIONS.find((r) => roles.includes(r.value));
  return found ? found.value : roles[0] || '';
}

/** Số điện thoại chỉ gồm chữ số, dạng nội địa (+84901234567 thành 0901234567) để gõ 090... vẫn tìm ra. */
function localDigits(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.startsWith('84') ? `0${digits.slice(2)}` : digits;
}

/** Lọc theo ô tìm kiếm (tên đăng nhập, email, số điện thoại), vai trò và trạng thái ('all' | 'active' | 'disabled'). */
export function filterUsers(users, { search = '', role = 'all', status = 'all' } = {}) {
  const q = search.trim().toLowerCase();
  return (Array.isArray(users) ? users : []).filter((u) => {
    if (q) {
      const hay = [u.username, u.email, u.phone].filter(Boolean).join(' ').toLowerCase();
      const qDigits = localDigits(q);
      const phoneMatch = qDigits.length >= 3 && localDigits(u.phone).includes(qDigits);
      if (!hay.includes(q) && !phoneMatch) return false;
    }
    if (role !== 'all' && primaryRole(u) !== role) return false;
    if (status === 'active' && !u.active) return false;
    if (status === 'disabled' && u.active) return false;
    return true;
  });
}

/** Số tài khoản theo từng vai trò chính, cộng số tài khoản đang bị khóa. */
export function summarizeUsers(users) {
  const list = Array.isArray(users) ? users : [];
  const byRole = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, 0]));
  for (const u of list) {
    const role = primaryRole(u);
    if (role in byRole) byRole[role] += 1;
  }
  return { total: list.length, byRole, disabled: list.filter((u) => !u.active).length };
}

/** Tài khoản đang đăng nhập không được tự đổi vai trò hay tự khóa mình. */
export function isSelf(user, currentUser) {
  return Boolean(user && currentUser) && (user.id === currentUser.id || user.username === currentUser.username);
}

const MESSAGES = {
  CANNOT_MODIFY_SELF: 'Bạn không thể tự đổi vai trò hay khóa chính tài khoản của mình.',
  LAST_ADMIN: 'Hệ thống phải còn ít nhất một quản trị viên đang hoạt động.',
  USER_NOT_FOUND: 'Không tìm thấy tài khoản. Hãy làm mới danh sách.',
  ROLE_NOT_FOUND: 'Vai trò này chưa có trong hệ thống.',
  FORBIDDEN: 'Chỉ quản trị viên mới được quản lý tài khoản.',
  NETWORK_ERROR: 'Không kết nối được máy chủ. Kiểm tra backend đã chạy chưa.',
};

/** Câu tiếng Việt cho lỗi trả về khi đổi vai trò hoặc khóa tài khoản. */
export function userErrorMessage(error, fallback = 'Không thực hiện được. Vui lòng thử lại.') {
  if (!error) return fallback;
  return MESSAGES[error.code] || fallback;
}
