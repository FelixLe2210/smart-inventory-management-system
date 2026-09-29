import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import WarehousePage from './pages/warehouse/WarehousePage';
import ProductPage from './pages/product/ProductPage';
import CategoryPage from './pages/category/CategoryPage';
import SupplierPage from './pages/supplier/SupplierPage';

/**
 * App – Router chính của Hệ thống Smart Inventory Management System for Demand Forecasting and Reorder Recommendation.
 * Đồng bộ toàn diện tất cả các phân hệ Master Data Sprint 3 (M1, M2, M3, M4):
 *   - /login           → Màn hình Đăng nhập (Công khai)
 *   - /warehouses      → Quản lý Chi nhánh Kho (Sprint3-13, 14, 15, 16)
 *   - /products        → Quản lý Sản phẩm SKU (Sprint3-09, Sprint3-12)
 *   - /categories      → Danh mục hàng hóa (Sprint3-10)
 *   - /suppliers       → Nhà cung cấp đối tác (Sprint3-11)
 *   - /forecasting     → Dự báo Nhu cầu (Demand Forecasting)
 *   - /recommendations → Đề xuất Đặt hàng (Reorder Recommendation)
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route công khai: Đăng nhập */}
        <Route path="/login" element={<LoginPage />} />

        {/* Các route yêu cầu xác thực người dùng (Protected Routes) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Phân hệ Master Data (Sprint 3 hoàn chỉnh) */}
            <Route path="/warehouses" element={<WarehousePage />} />
            <Route path="/products" element={<ProductPage />} />
            <Route path="/categories" element={<CategoryPage />} />
            <Route path="/suppliers" element={<SupplierPage />} />

            {/* Phân hệ Trọng tâm: Dự báo nhu cầu & Đề xuất đặt hàng (AI Core) */}
            <Route path="/forecasting" element={<PlaceholderPage title="Dự báo Nhu cầu (Context-Aware Demand Forecasting)" icon="trending_up" />} />
            <Route path="/recommendations" element={<PlaceholderPage title="Đề xuất Đặt hàng Thông minh (Intelligent Reorder Recommendation)" icon="auto_awesome" />} />

            {/* Các phân hệ mở rộng theo kế hoạch Sprint sau */}
            <Route path="/dashboard" element={<PlaceholderPage title="Bàn làm việc (Dashboard)" icon="dashboard" />} />
            <Route path="/inventory" element={<PlaceholderPage title="Kiểm kê & Tồn kho" icon="shelves" />} />
            <Route path="/inbound" element={<PlaceholderPage title="Phiếu Nhập kho (Inbound)" icon="move_to_inbox" />} />
            <Route path="/outbound" element={<PlaceholderPage title="Phiếu Xuất kho (Outbound)" icon="outbox" />} />
            <Route path="/reports" element={<PlaceholderPage title="Báo cáo & Phân tích" icon="monitoring" />} />
            <Route path="/settings" element={<PlaceholderPage title="Cài đặt hệ thống" icon="settings" />} />
          </Route>
        </Route>

        {/* Mặc định chuyển hướng về /warehouses (sẽ qua kiểm tra đăng nhập) */}
        <Route path="/" element={<Navigate to="/warehouses" replace />} />
        <Route path="*" element={<Navigate to="/warehouses" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

/** Placeholder cho các route chưa implement */
function PlaceholderPage({ title, icon }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-on-surface-variant p-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-surface-container-high flex items-center justify-center text-primary">
        <span className="material-symbols-outlined text-[40px] opacity-80">{icon}</span>
      </div>
      <div>
        <h2 className="font-headline-md text-headline-md text-on-surface mb-1">{title}</h2>
        <p className="font-body-sm text-body-sm text-secondary max-w-md mx-auto">
          Phân hệ đang được đội ngũ kỹ sư phát triển theo đúng kế hoạch Sprint tiếp theo. Vui lòng sử dụng các phân hệ Master Data (Kho, Sản phẩm, Danh mục, Nhà cung cấp).
        </p>
      </div>
    </div>
  );
}
