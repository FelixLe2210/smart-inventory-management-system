import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtime } from '../realtime/RealtimeProvider';

const STATUS_LABEL = {
  open: { text: 'Đang cập nhật trực tiếp', dot: 'bg-green-500' },
  connecting: { text: 'Đang kết nối...', dot: 'bg-amber-400' },
  reconnecting: { text: 'Mất kết nối, đang thử lại...', dot: 'bg-amber-400' },
  closed: { text: 'Chưa kết nối', dot: 'bg-outline' },
};

/** Chuông thông báo cảnh báo tồn kho theo thời gian thực + trạng thái kết nối. */
export default function NotificationBell() {
  const { status, notifications, unread, markRead, clearNotifications } = useRealtime();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const state = STATUS_LABEL[status] || STATUS_LABEL.closed;

  const toggle = () => {
    setOpen((prev) => !prev);
    if (!open) markRead();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative p-1.5 rounded-lg text-secondary hover:bg-surface-container-high hover:text-on-surface transition-colors"
        aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ''}`}
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant z-50">
          <div className="px-4 py-2 border-b border-outline-variant flex items-center justify-between">
            <div>
              <p className="font-body-sm-medium text-on-surface">Cảnh báo tồn kho</p>
              <p className="font-label-sm text-secondary flex items-center gap-1">
                <span className={`inline-block w-2 h-2 rounded-full ${state.dot}`} />
                {state.text}
              </p>
            </div>
            {notifications.length > 0 && (
              <button type="button" onClick={clearNotifications} className="font-label-sm text-primary hover:underline">
                Xóa tất cả
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <li className="px-4 py-6 text-center font-body-sm text-secondary">Chưa có cảnh báo mới.</li>
            )}
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate('/alerts');
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-surface-container-low flex gap-2"
                >
                  <span
                    className={`material-symbols-outlined text-[18px] mt-0.5 ${n.level === 'error' ? 'text-error' : n.level === 'info' ? 'text-primary' : 'text-amber-600'}`}
                  >
                    {n.level === 'error' ? 'error' : n.level === 'info' ? 'receipt_long' : 'warning'}
                  </span>
                  <span>
                    <span className="block font-body-sm-medium text-on-surface">{n.title}</span>
                    <span className="block font-label-sm text-on-surface-variant">{n.text}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
