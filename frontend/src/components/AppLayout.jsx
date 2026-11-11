import { Outlet } from "react-router-dom";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import { RealtimeProvider } from "../realtime/RealtimeProvider";

/**
 * AppLayout – Layout chính bao gồm Header cố định + Sidebar trái + vùng nội dung.
 * Tất cả page sau login đều render bên trong <Outlet />.
 */
export default function AppLayout() {
  return (
    <RealtimeProvider>
    <div className="bg-surface font-body-default text-on-surface min-h-screen">
      {/* Thanh bên cao hết màn hình; header nằm trên vùng nội dung */}
      <AppSidebar />
      <AppHeader />

      {/* Main content area — offset để không bị header/sidebar che */}
      <div className="pl-64 pt-14">
        <main className="w-full min-h-screen bg-surface">
          <Outlet />
        </main>
      </div>
    </div>
    </RealtimeProvider>
  );
}
