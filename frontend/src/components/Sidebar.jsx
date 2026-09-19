import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const menuItems = [
  { path: '/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/products',  icon: '📦', label: 'Sản phẩm' },
  { path: '/inventory', icon: '🏭', label: 'Tồn kho' },
  { path: '/orders',    icon: '📋', label: 'Đơn hàng' },
  { path: '/reports',   icon: '📈', label: 'Báo cáo' },
  { path: '/settings',  icon: '⚙️',  label: 'Cài đặt' },
];

/**
 * Sidebar điều hướng chính.
 * Dùng NavLink để tự động thêm class active khi khớp route.
 */
export default function Sidebar() {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <span className="sidebar-logo-icon">📦</span>
        <span className="sidebar-logo-text">SmartInventory</span>
      </div>

      {/* Menu */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' sidebar-link--active' : ''}`
            }
          >
            <span className="sidebar-link-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="sidebar-link-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <span>v0.1.0 — M3</span>
      </div>
    </aside>
  );
}
