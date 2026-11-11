import { canManageUsers, canOperateStock } from '../utils/permissionsLogic.js';

/** Cấu trúc điều hướng dùng chung cho thanh bên và tiêu đề trang. `operate`: chỉ hiện cho người được vận hành kho; `admin`: chỉ hiện cho quản trị viên. */
export const NAV_GROUPS = [
  {
    title: 'Tổng quan',
    items: [{ to: '/dashboard', label: 'Tổng quan', icon: 'space_dashboard' }],
  },
  {
    title: 'Vận hành kho',
    items: [
      { to: '/inventory', label: 'Tồn kho', icon: 'shelves' },
      { to: '/inbound', operate: true, label: 'Nhập kho', icon: 'move_to_inbox' },
      { to: '/outbound', operate: true, label: 'Xuất kho', icon: 'outbox' },
      { to: '/transfer', operate: true, label: 'Chuyển kho', icon: 'swap_horiz' },
      { to: '/transactions', label: 'Lịch sử giao dịch', icon: 'history' },
      { to: '/alerts', label: 'Cảnh báo tồn kho', icon: 'notification_important', alerts: true },
    ],
  },
  {
    title: 'Dự báo và đặt hàng',
    badge: 'AI',
    items: [
      { to: '/forecasting', label: 'Dự báo nhu cầu', icon: 'trending_up' },
      { to: '/recommendations', label: 'Đề xuất đặt hàng', icon: 'auto_awesome' },
      { to: '/purchase-orders', label: 'Đơn đặt hàng', icon: 'receipt_long' },
    ],
  },
  {
    title: 'Danh mục',
    items: [
      { to: '/warehouses', label: 'Kho', icon: 'warehouse' },
      { to: '/products', label: 'Sản phẩm', icon: 'inventory_2' },
      { to: '/categories', label: 'Nhóm hàng', icon: 'category' },
      { to: '/suppliers', label: 'Nhà cung cấp', icon: 'local_shipping' },
    ],
  },
  {
    title: 'Báo cáo',
    items: [{ to: '/reports', label: 'Báo cáo và phân tích', icon: 'monitoring' }],
  },
  {
    title: 'Quản trị',
    items: [{ to: '/users', admin: true, label: 'Người dùng và vai trò', icon: 'manage_accounts' }],
  },
];

const TITLES = Object.fromEntries(NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.to, { title: i.label, group: g.title }])));

/** Tiêu đề và nhóm của đường dẫn hiện tại (để hiện trên header). */
export function titleFor(pathname) {
  return TITLES[pathname] || { title: 'Smart Inventory', group: '' };
}

/** Các nhóm điều hướng người dùng này được thấy (VIEWER không thấy Nhập, Xuất, Chuyển kho; chỉ ADMIN thấy Quản trị). */
export function navGroupsFor(user) {
  const operate = canOperateStock(user);
  const admin = canManageUsers(user);
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => (!i.operate || operate) && (!i.admin || admin)),
  })).filter((g) => g.items.length > 0);
}
