import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

/**
 * Layout chính của ứng dụng sau khi đăng nhập.
 * Cấu trúc: Sidebar (trái) + vùng chính (Header + nội dung).
 */
export default function Layout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <Header />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
