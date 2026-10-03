import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthContainer from '../components/auth/AuthContainer';
import { getCurrentUser } from '../api/httpClient';

/**
 * LoginPage – Trang đăng nhập hệ thống LogiCore WMS.
 * Tự động chuyển hướng vào hệ thống (/warehouses) sau khi đăng nhập thành công.
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

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-surface relative p-4 py-8">
      {/* ── Container đăng nhập chính (Figma design: AuthContainer) ── */}
      <AuthContainer onLoginSuccess={handleLoginSuccess} />
    </div>
  );
}
