import { Navigate, Outlet } from 'react-router-dom';
import { getCurrentUser } from '../api/httpClient';
import { canManageUsers } from '../utils/permissionsLogic';

/** Chặn tài khoản không phải quản trị viên vào trang quản lý người dùng; đưa về Tổng quan. */
export default function RequireAdmin() {
  return canManageUsers(getCurrentUser()) ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
