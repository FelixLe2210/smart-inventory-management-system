import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getAccessToken, getCurrentUser } from '../api/httpClient';

/**
 * ProtectedRoute – Bảo vệ các route yêu cầu đăng nhập.
 * Nếu chưa đăng nhập (không có token hoặc user), chuyển hướng về /login.
 */
export default function ProtectedRoute() {
  const location = useLocation();
  const token = getAccessToken();
  const user = getCurrentUser();

  // Kiểm tra nếu có token hoặc user trong session/localStorage
  const isAuthenticated = Boolean(token || user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
