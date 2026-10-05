import { NavLink } from "react-router-dom";

/**
 * AppSidebar – Thanh điều hướng dọc cố định bên trái của Smart Inventory Management System
 * for Demand Forecasting and Reorder Recommendation.
 * Tương thích và đồng bộ toàn bộ Master Data của Sprint 3 (M1, M2, M3, M4).
 */
export default function AppSidebar() {
  return (
    <aside className="fixed left-0 top-14 bottom-0 w-64 bg-surface-container-lowest z-40 flex flex-col justify-between overflow-y-auto shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="py-space-md">
        {/* Section 1: Điều hành chung */}
        <div className="px-space-lg mb-space-xs">
          <span className="font-label-sm text-label-sm text-secondary uppercase font-bold tracking-wider">
            Điều hành chung
          </span>
        </div>

        <nav className="flex flex-col gap-0.5 px-space-sm mb-space-md">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-space-sm px-space-md py-2 rounded-lg font-body-sm text-body-sm transition-colors ${
                isActive
                  ? "bg-primary-container text-on-primary-container font-body-sm-medium"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span>Bàn làm việc (Dashboard)</span>
          </NavLink>
        </nav>

        {/* Section 2: Dữ liệu Danh mục (Master Data - Sprint 3) */}
        <div className="px-space-lg mb-space-xs">
          <span className="font-label-sm text-label-sm text-secondary uppercase font-bold tracking-wider">
            Quản trị Master Data
          </span>
        </div>

        <nav className="flex flex-col gap-0.5 px-space-sm mb-space-md">
          {/* Quản lý Kho bãi (M4) */}
          <NavLink
            to="/warehouses"
            className={({ isActive }) =>
              `flex items-center gap-space-sm px-space-md py-2 rounded-lg font-body-sm text-body-sm transition-colors ${
                isActive
                  ? "bg-primary-container text-on-primary-container font-body-sm-medium"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">warehouse</span>
            <span>Chi nhánh Kho bãi</span>
          </NavLink>

          {/* Quản lý Sản phẩm (M3: Sprint3-09, Sprint3-12) */}
          <NavLink
            to="/products"
            className={({ isActive }) =>
              `flex items-center gap-space-sm px-space-md py-2 rounded-lg font-body-sm text-body-sm transition-colors ${
                isActive
                  ? "bg-primary-container text-on-primary-container font-body-sm-medium"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            <span>Danh mục Sản phẩm (SKU)</span>
          </NavLink>

          {/* Phân loại hàng hóa (M3: Sprint3-10) */}
          <NavLink
            to="/categories"
            className={({ isActive }) =>
              `flex items-center gap-space-sm px-space-md py-2 rounded-lg font-body-sm text-body-sm transition-colors ${
                isActive
                  ? "bg-primary-container text-on-primary-container font-body-sm-medium"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">category</span>
            <span>Nhóm & Phân loại hàng</span>
          </NavLink>

          {/* Nhà cung cấp (M3: Sprint3-11) */}
          <NavLink
            to="/suppliers"
            className={({ isActive }) =>
              `flex items-center gap-space-sm px-space-md py-2 rounded-lg font-body-sm text-body-sm transition-colors ${
                isActive
                  ? "bg-primary-container text-on-primary-container font-body-sm-medium"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">local_shipping</span>
            <span>Nhà cung cấp đối tác</span>
          </NavLink>
        </nav>

        {/* Section 3: AI Demand Forecasting & Reorder Recommendation */}
        <div className="px-space-lg mb-space-xs">
          <span className="font-label-sm text-label-sm text-secondary uppercase font-bold tracking-wider flex items-center justify-between">
            <span>Dự báo & Đề xuất AI</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary text-on-primary font-bold">AI CORE</span>
          </span>
        </div>

        <nav className="flex flex-col gap-0.5 px-space-sm mb-space-md">
          <NavLink
            to="/forecasting"
            className={({ isActive }) =>
              `flex items-center gap-space-sm px-space-md py-2 rounded-lg font-body-sm text-body-sm transition-colors ${
                isActive
                  ? "bg-primary-container text-on-primary-container font-body-sm-medium"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">trending_up</span>
            <span>Dự báo nhu cầu (Forecasting)</span>
          </NavLink>

          <NavLink
            to="/recommendations"
            className={({ isActive }) =>
              `flex items-center gap-space-sm px-space-md py-2 rounded-lg font-body-sm text-body-sm transition-colors ${
                isActive
                  ? "bg-primary-container text-on-primary-container font-body-sm-medium"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            <span>Đề xuất đặt hàng (Reorder)</span>
          </NavLink>
        </nav>

        {/* Section 4: Vận hành kho */}
        <div className="px-space-lg mb-space-xs">
          <span className="font-label-sm text-label-sm text-secondary uppercase font-bold tracking-wider">
            Vận hành Kho vận
          </span>
        </div>

        <nav className="flex flex-col gap-0.5 px-space-sm">
          <NavLink
            to="/inventory"
            className={({ isActive }) =>
              `flex items-center gap-space-sm px-space-md py-2 rounded-lg font-body-sm text-body-sm transition-colors ${
                isActive
                  ? "bg-primary-container text-on-primary-container font-body-sm-medium"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">shelves</span>
            <span>Kiểm kê & Tồn kho</span>
          </NavLink>

          <NavLink
            to="/inbound"
            className={({ isActive }) =>
              `flex items-center gap-space-sm px-space-md py-2 rounded-lg font-body-sm text-body-sm transition-colors ${
                isActive
                  ? "bg-primary-container text-on-primary-container font-body-sm-medium"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">move_to_inbox</span>
            <span>Phiếu Nhập kho (Inbound)</span>
          </NavLink>

          <NavLink
            to="/outbound"
            className={({ isActive }) =>
              `flex items-center gap-space-sm px-space-md py-2 rounded-lg font-body-sm text-body-sm transition-colors ${
                isActive
                  ? "bg-primary-container text-on-primary-container font-body-sm-medium"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">outbox</span>
            <span>Phiếu Xuất kho (Outbound)</span>
          </NavLink>

          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `flex items-center gap-space-sm px-space-md py-2 rounded-lg font-body-sm text-body-sm transition-colors ${
                isActive
                  ? "bg-primary-container text-on-primary-container font-body-sm-medium"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">monitoring</span>
            <span>Báo cáo & Phân tích</span>
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-space-sm px-space-md py-2 rounded-lg font-body-sm text-body-sm transition-colors ${
                isActive
                  ? "bg-primary-container text-on-primary-container font-body-sm-medium"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span>Cài đặt hệ thống</span>
          </NavLink>
        </nav>
      </div>

      {/* ── Capacity widget ── */}
      <div className="p-space-md m-space-sm rounded-lg bg-surface-container-low">
        <div className="flex items-center justify-between mb-1">
          <span className="font-label-default text-label-default text-on-surface">Tải trọng kho TP.HCM</span>
          <span className="font-label-sm text-label-sm text-primary font-bold">88%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-secondary-container overflow-hidden">
          <div className="h-full rounded-full bg-primary-container" style={{ width: "88%" }} />
        </div>
        <span className="block mt-1 font-label-sm text-label-sm text-secondary">14,080 / 16,000 Pallet</span>
      </div>
    </aside>
  );
}
