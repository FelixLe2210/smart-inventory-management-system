import { NavLink } from 'react-router-dom';
import { navGroupsFor } from './navConfig';
import { getCurrentUser } from '../api/httpClient';
import { useRealtime } from '../realtime/RealtimeProvider';

/** Thanh điều hướng: mảng màu mực đậm làm điểm nhận diện, nhóm theo việc người dùng làm hằng ngày. */
export default function AppSidebar() {
  const { unread } = useRealtime();
  const groups = navGroupsFor(getCurrentUser());

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-nav text-nav-fg z-40 flex flex-col">
      <div className="h-14 shrink-0 px-5 flex items-center gap-3 border-b border-nav-line">
        <div className="w-8 h-8 rounded-lg bg-nav-accent text-nav flex items-center justify-center">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">deployed_code</span>
        </div>
        <div className="leading-tight">
          <p className="font-bold text-[15px] text-nav-active-fg tracking-tight">Smart Inventory</p>
          <p className="text-[11px] text-nav-muted">Dự báo và đặt hàng</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Điều hướng chính">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-1.5 flex items-center gap-2 text-[11px] font-semibold text-nav-muted">
              {group.title}
              {group.badge && (
                <span className="px-1.5 rounded bg-nav-accent/15 text-nav-accent text-[10px] font-bold leading-4">
                  {group.badge}
                </span>
              )}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                        isActive
                          ? 'bg-nav-active text-nav-active-fg font-semibold'
                          : 'text-nav-fg hover:bg-nav-hover hover:text-nav-active-fg'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-nav-accent" aria-hidden="true" />
                        )}
                        <span
                          className={`material-symbols-outlined text-[20px] ${isActive ? 'text-nav-accent' : 'text-nav-muted group-hover:text-nav-fg'}`}
                          aria-hidden="true"
                        >
                          {item.icon}
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.alerts && unread > 0 && (
                          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center">
                            {unread > 9 ? '9+' : unread}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-nav-line px-5 py-3 text-[11px] text-nav-muted">
        Phiên bản 1.0
      </div>
    </aside>
  );
}
