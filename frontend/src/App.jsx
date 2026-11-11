import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import RequireOperate from './components/RequireOperate';
import RequireAdmin from './components/RequireAdmin';
const WarehousePage = lazy(() => import('./pages/warehouse/WarehousePage'));
const ProductPage = lazy(() => import('./pages/product/ProductPage'));
const CategoryPage = lazy(() => import('./pages/category/CategoryPage'));
const SupplierPage = lazy(() => import('./pages/supplier/SupplierPage'));
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage'));
const StockMovementPage = lazy(() => import('./pages/stock-movement/StockMovementPage'));
const StockTransferPage = lazy(() => import('./pages/stock-transfer/StockTransferPage'));
const TransactionHistoryPage = lazy(() => import('./pages/transactions/TransactionHistoryPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const AlertsPage = lazy(() => import('./pages/alerts/AlertsPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const ForecastPage = lazy(() => import('./pages/forecasting/ForecastPage'));
const RecommendationsPage = lazy(() => import('./pages/recommendations/RecommendationsPage'));
const PurchaseOrdersPage = lazy(() => import('./pages/purchase-orders/PurchaseOrdersPage'));
const UsersPage = lazy(() => import('./pages/users/UsersPage'));

/**
 * Bộ định tuyến chính. /login là công khai; mọi trang còn lại cần đăng nhập.
 * Nhập, xuất và chuyển kho yêu cầu quyền vận hành kho (RequireOperate); trang Người dùng chỉ dành cho ADMIN (RequireAdmin).
 */
export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
      <Routes>
        {/* Công khai */}
        <Route path="/login" element={<LoginPage />} />

        {/* Cần đăng nhập */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Danh mục gốc */}
            <Route path="/warehouses" element={<WarehousePage />} />
            <Route path="/products" element={<ProductPage />} />
            <Route path="/categories" element={<CategoryPage />} />
            <Route path="/suppliers" element={<SupplierPage />} />

            {/* Dự báo nhu cầu và đề xuất đặt hàng */}
            <Route path="/forecasting" element={<ForecastPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />

            {/* Vận hành kho, cảnh báo và báo cáo */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route element={<RequireOperate />}>
              <Route path="/inbound" element={<StockMovementPage mode="RECEIVING" />} />
              <Route path="/outbound" element={<StockMovementPage mode="ISSUING" />} />
              <Route path="/transfer" element={<StockTransferPage />} />
            </Route>
            <Route path="/transactions" element={<TransactionHistoryPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/reports" element={<ReportsPage />} />

            {/* Quản trị tài khoản: chỉ ADMIN */}
            <Route element={<RequireAdmin />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>

        {/* Mặc định về Tổng quan (qua kiểm tra đăng nhập) */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

/** Hiển thị trong lúc tải mã của trang (mỗi trang được tách thành một gói riêng). */
function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-secondary" role="status" aria-live="polite">
      <span className="material-symbols-outlined mr-2 animate-spin text-[20px]">progress_activity</span>
      Đang tải...
    </div>
  );
}
