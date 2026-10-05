import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, clearAccessToken, clearCurrentUser } from '../api/httpClient';

/**
 * AppHeader – Thanh header cố định phía trên của toàn ứng dụng.
 * Hiển thị: Logo, thanh tìm kiếm toàn cục, bộ chọn chi nhánh, thông báo, thông tin user và nút Đăng xuất.
 */
export default function AppHeader() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getCurrentUser());
  const [showDropdown, setShowDropdown] = useState(false);

  const displayName = user?.name || user?.username || 'Lý Nguyễn';
  const displayRole = user?.roles?.[0] ? user.roles[0].replace('ROLE_', '') : 'Quản lý';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'LN';

  const handleLogout = () => {
    clearAccessToken();
    clearCurrentUser();
    setUser(null);
    navigate('/login', { replace: true });
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-50 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-14 w-full px-margin flex items-center justify-between gap-space-lg">

        {/* ── Logo & Brand ── */}
        <div className="flex items-center gap-space-md">
          <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[22px]">inventory_2</span>
          </div>
          <div className="flex flex-col">
            <span className="font-title text-title text-primary tracking-tight font-bold">Smart Inventory</span>
            <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold text-[10.5px] tracking-wide">
              Demand Forecasting & Reorder Recommendation
            </span>
          </div>
        </div>

        {/* ── Global Search ── */}
        <div className="flex-1 max-w-xl mx-space-lg">
          <div className="relative flex items-center w-full">
            <span className="material-symbols-outlined absolute left-3 text-secondary text-[18px]">
              search
            </span>
            <input
              className="w-full h-8 pl-9 pr-4 bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-lg outline-none placeholder:text-outline focus:bg-surface-container-lowest transition-colors"
              placeholder="Tìm kiếm mã kho, mã vị trí hoặc SKU sản phẩm (Phím tắt: Ctrl + K)..."
              type="text"
            />
          </div>
        </div>

        {/* ── Right Actions ── */}
        <div className="flex items-center gap-space-md">
          {/* Branch selector */}
          <div className="hidden lg:flex items-center gap-space-xs px-space-sm py-1 rounded-lg bg-surface-container-low text-on-surface cursor-pointer hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-secondary text-[18px]">store</span>
            <span className="font-label-default text-label-default text-on-surface-variant">Chi nhánh:</span>
            <span className="font-body-sm-medium text-body-sm-medium text-primary">Toàn quốc / Miền Nam</span>
            <span className="material-symbols-outlined text-secondary text-[16px]">expand_more</span>
          </div>

          {/* Notification bell */}
          <button
            className="relative p-1.5 rounded-lg text-secondary hover:bg-surface-container-high hover:text-on-surface transition-colors"
            aria-label="Thông báo"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error" />
          </button>

          {/* User info & dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDropdown((prev) => !prev)}
              className="flex items-center gap-space-sm pl-space-sm p-1 rounded-lg hover:bg-surface-container-low transition-colors"
              aria-label="Menu tài khoản"
            >
              <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-sm font-bold">
                {initials}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <div className="flex items-center gap-space-xs">
                  <span className="font-body-sm-medium text-body-sm-medium text-on-surface">{displayName}</span>
                  <span className="px-1.5 py-0.5 rounded font-label-sm text-label-sm bg-secondary-container text-on-secondary-container">
                    {displayRole}
                  </span>
                </div>
                <span className="font-label-default text-label-default text-on-surface-variant">
                  {user?.email || 'Vận hành Kho tổng'}
                </span>
              </div>
              <span className="material-symbols-outlined text-secondary text-[18px]">expand_more</span>
            </button>

            {/* Dropdown menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant py-1 z-50 animate-fadeIn">
                <div className="px-4 py-2 border-b border-outline-variant md:hidden">
                  <p className="font-body-sm-medium text-on-surface">{displayName}</p>
                  <p className="text-secondary font-label-sm">{user?.email || 'admin@smartinventory.vn'}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left font-body-sm text-error hover:bg-error-container/30 flex items-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
