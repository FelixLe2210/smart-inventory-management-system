import { Navigate, Outlet } from 'react-router-dom';
import { getCurrentUser } from '../api/httpClient';
import { canOperateStock } from '../utils/permissionsLogic';

/** Chặn tài khoản chỉ xem vào các trang ghi dữ liệu kho; đưa về Tổng quan. */
export default function RequireOperate() {
  return canOperateStock(getCurrentUser()) ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
