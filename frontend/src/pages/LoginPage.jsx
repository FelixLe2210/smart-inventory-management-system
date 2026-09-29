import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthContainer from '../components/auth/AuthContainer';
import { DEMO_ACCOUNTS } from '../components/auth/LoginForm';
import { getCurrentUser, setAccessToken, setCurrentUser } from '../api/httpClient';

/**
 * LoginPage – Trang đăng nhập hệ thống LogiCore WMS.
 * Tự động chuyển hướng vào hệ thống (/warehouses) sau khi đăng nhập thành công.
 * Hỗ trợ danh sách tài khoản test thử nghiệm nhanh.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/warehouses';

  const [loggedInUser, setLoggedInUser] = useState(() => getCurrentUser());

  useEffect(() => {
    if (loggedInUser) {
      navigate(from, { replace: true });
    }
  }, [loggedInUser, navigate, from]);

  const handleLoginSuccess = (user) => {
    setLoggedInUser(user);
    navigate(from, { replace: true });
  };

  const handleQuickLoginAs = (accountKey) => {
    const acc = DEMO_ACCOUNTS[accountKey];
    if (!acc) return;

    const userObj = {
      id: accountKey === 'admin' ? 1 : accountKey === 'tester' ? 2 : 3,
      username: acc.username,
      name: acc.name,
      email: acc.email,
      roles: acc.roles,
      accessToken: `demo-token-${acc.username}`,
    };

    setAccessToken(userObj.accessToken);
    setCurrentUser(userObj);
    handleLoginSuccess(userObj);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-surface relative p-4 py-8">
      {/* ── Brand Title ── */}
      <div className="flex flex-col items-center gap-1 mb-6 text-center animate-fadeIn">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container/30 text-primary font-bold text-[12px] mb-1">
          <span className="material-symbols-outlined text-[16px]">inventory_2</span>
          <span>Hệ thống Quản lý Kho Thông minh</span>
        </div>
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
          Smart Inventory Management System
        </h2>
        <p className="font-body-sm text-secondary text-[13px] font-medium">
          for Demand Forecasting and Reorder Recommendation
        </p>
      </div>

      {/* ── Container đăng nhập chính (Figma design: AuthContainer) ── */}
      <AuthContainer onLoginSuccess={handleLoginSuccess} />

      {/* ── Bảng thông tin tài khoản test mẫu ── */}
      <div className="mt-6 w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant p-5 animate-fadeIn">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-primary text-[22px]">badge</span>
          <h3 className="font-body-sm-medium text-body-sm-medium text-on-surface font-bold">
            Tài khoản mẫu để kiểm tra đăng nhập (Bấm để đăng nhập ngay)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Admin */}
          <div
            onClick={() => handleQuickLoginAs('admin')}
            className="p-3 rounded-xl bg-surface-container-low hover:bg-primary-container/30 border border-transparent hover:border-primary/40 cursor-pointer transition-all flex flex-col gap-1 group"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-body-sm text-primary group-hover:text-primary">1. Quản trị viên</span>
              <span className="px-1.5 py-0.5 rounded text-[11px] bg-primary text-on-primary font-bold">ADMIN</span>
            </div>
            <div className="font-code-mono text-[12px] text-on-surface-variant flex flex-col mt-1">
              <span>User: <strong className="text-on-surface font-bold">admin</strong></span>
              <span>Pass: <strong className="text-on-surface font-bold">Admin@123</strong></span>
            </div>
            <span className="text-[11px] text-secondary mt-1 group-hover:text-primary flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[14px]">login</span> Đăng nhập ngay
            </span>
          </div>

          {/* Manager */}
          <div
            onClick={() => handleQuickLoginAs('tester')}
            className="p-3 rounded-xl bg-surface-container-low hover:bg-secondary-container/30 border border-transparent hover:border-secondary/40 cursor-pointer transition-all flex flex-col gap-1 group"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-body-sm text-secondary group-hover:text-secondary">2. Quản lý kho</span>
              <span className="px-1.5 py-0.5 rounded text-[11px] bg-secondary-container text-on-secondary-container font-bold">MANAGER</span>
            </div>
            <div className="font-code-mono text-[12px] text-on-surface-variant flex flex-col mt-1">
              <span>User: <strong className="text-on-surface font-bold">tester</strong></span>
              <span>Pass: <strong className="text-on-surface font-bold">Tester@123</strong></span>
            </div>
            <span className="text-[11px] text-secondary mt-1 group-hover:text-secondary flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[14px]">login</span> Đăng nhập ngay
            </span>
          </div>

          {/* Staff */}
          <div
            onClick={() => handleQuickLoginAs('staff')}
            className="p-3 rounded-xl bg-surface-container-low hover:bg-tertiary-container/30 border border-transparent hover:border-tertiary/40 cursor-pointer transition-all flex flex-col gap-1 group"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-body-sm text-tertiary group-hover:text-tertiary">3. Nhân viên kho</span>
              <span className="px-1.5 py-0.5 rounded text-[11px] bg-tertiary-container text-on-tertiary-container font-bold">STAFF</span>
            </div>
            <div className="font-code-mono text-[12px] text-on-surface-variant flex flex-col mt-1">
              <span>User: <strong className="text-on-surface font-bold">staff</strong></span>
              <span>Pass: <strong className="text-on-surface font-bold">Staff@123</strong></span>
            </div>
            <span className="text-[11px] text-secondary mt-1 group-hover:text-tertiary flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[14px]">login</span> Đăng nhập ngay
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
