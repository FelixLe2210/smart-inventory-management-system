import { Outlet } from "react-router-dom";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";

/**
 * AppLayout – Layout chính bao gồm Header cố định + Sidebar trái + vùng nội dung.
 * Tất cả page sau login đều render bên trong <Outlet />.
 */
export default function AppLayout() {
  return (
    <div className="bg-surface font-body-default text-on-surface min-h-screen">
      {/* Fixed header */}
      <AppHeader />

      {/* Fixed sidebar */}
      <AppSidebar />

      {/* Main content area — offset để không bị header/sidebar che */}
      <div className="pl-64 pt-14">
        <main className="w-full min-h-screen bg-surface">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
