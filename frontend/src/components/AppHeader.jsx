import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import { titleFor } from './navConfig';
import { useRealtime } from '../realtime/RealtimeProvider';
import { getCurrentUser, clearAccessToken, clearCurrentUser } from '../api/httpClient';

const ROLE_LABEL = { ADMIN: 'Quản trị', MANAGER: 'Quản lý', STAFF: 'Nhân viên kho', VIEWER: 'Chỉ xem' };

/** Header trên vùng nội dung: tên trang, trạng thái dữ liệu trực tiếp, đổi giao diện, thông báo, tài khoản. */
export default function AppHeader() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { status } = useRealtime();
  const [user, setUser] = useState(() => getCurrentUser());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const { title, group } = titleFor(pathname);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const displayName = user?.fullName || user?.name || user?.username || 'Người dùng';
  const rawRole = String(user?.roles?.[0] || '').replace('ROLE_', '');
  const roleText = ROLE_LABEL[rawRole] || rawRole || 'Thành viên';
  const initials =
    displayName.split(' ').filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase() || 'U';

  const handleLogout = () => {
    clearAccessToken();
    clearCurrentUser();
    setUser(null);
    navigate('/login', { replace: true });
  };

  const live = status === 'open';

  return (
    <header className="fixed top-0 left-64 right-0 h-14 z-30 bg-surface-container-lowest/90 backdrop-blur border-b border-outline-variant/60">
      <div className="h-full px-margin flex items-center justify-between gap-4">
        <div className="min-w-0">
          {group && <p className="text-[11px] text-secondary leading-none mb-1">{group}</p>}
          <h1 className="text-[15px] font-semibold text-on-surface leading-none truncate">{title}</h1>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`hidden md:inline-flex items-center gap-2 mr-2 px-2.5 h-7 rounded-full text-[12px] font-medium border ${
              live
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
            title={live ? 'Số liệu tồn kho đang được cập nhật trực tiếp' : 'Mất kết nối trực tiếp, đang thử lại'}
          >
            <span
              className={`w-2 h-2 rounded-full ${live ? 'bg-[rgb(var(--live))] animate-pulseDot' : 'bg-amber-500'}`}
              aria-hidden="true"
            />
            {live ? 'Trực tiếp' : 'Đang kết nối lại'}
          </span>

          <ThemeToggle />
          <NotificationBell />

          <div className="relative ml-1" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-lg hover:bg-surface-container-low transition-colors"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Menu tài khoản"
            >
              <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-[12px] font-bold">
                {initials}
              </span>
              <span className="hidden md:block text-left leading-tight">
                <span className="block text-[13px] font-medium text-on-surface">{displayName}</span>
                <span className="block text-[11px] text-secondary">{roleText}</span>
              </span>
              <span className="material-symbols-outlined text-secondary text-[18px]" aria-hidden="true">expand_more</span>
            </button>

            {menuOpen && (
              <div role="menu" className="absolute right-0 mt-2 w-56 bg-surface-container-lowest rounded-xl shadow-lift border border-outline-variant py-1 animate-fadeIn">
                <div className="px-4 py-2.5 border-b border-outline-variant/70">
                  <p className="text-[13px] font-medium text-on-surface">{displayName}</p>
                  <p className="text-[11px] text-secondary">{user?.email || roleText}</p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-[13px] text-error hover:bg-error-container/40 flex items-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">logout</span>
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
