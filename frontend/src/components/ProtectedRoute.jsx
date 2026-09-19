import { Navigate, Outlet } from 'react-router-dom';
import { getAccessToken } from '../api/httpClient';

/**
 * Bảo vệ các route yêu cầu đăng nhập.
 * Nếu chưa có token → redirect về /login.
 * Nếu đã có token → render route con bình thường.
 */
export default function ProtectedRoute() {
  const token = getAccessToken();
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
