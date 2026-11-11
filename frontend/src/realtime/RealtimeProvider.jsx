import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getAccessToken } from '../api/httpClient';
import {
  PING_INTERVAL_MS,
  addNotification,
  buildSocketUrl,
  markAllRead,
  nextDelay,
  parseMessage,
  toNotification,
  unreadCount,
} from './inventoryRealtime';

/** status: connecting | open | reconnecting | closed (closed = không có token hoặc đã unmount). */
const RealtimeContext = createContext({
  status: 'closed',
  notifications: [],
  unread: 0,
  markRead: () => {},
  clearNotifications: () => {},
  subscribe: () => () => {},
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

/**
 * Một kết nối WebSocket cho cả ứng dụng (đặt trong AppLayout, sau đăng nhập).
 * Tự kết nối lại với thời gian chờ tăng dần; gửi "ping" định kỳ để phát hiện đứt mạng sớm.
 * Trang nào cần dữ liệu trực tiếp gọi subscribe(callback) và nhận { type, data }.
 */
export function RealtimeProvider({ children }) {
  const [status, setStatus] = useState('connecting');
  const [notifications, setNotifications] = useState([]);
  const listeners = useRef(new Set());

  const subscribe = useCallback((callback) => {
    listeners.current.add(callback);
    return () => listeners.current.delete(callback);
  }, []);

  useEffect(() => {
    let socket = null;
    let attempt = 0;
    let retryTimer = null;
    let pingTimer = null;
    let disposed = false;

    const clearTimers = () => {
      clearTimeout(retryTimer);
      clearInterval(pingTimer);
    };

    const connect = () => {
      const token = getAccessToken();
      if (!token) {
        setStatus('closed');
        return;
      }
      setStatus(attempt === 0 ? 'connecting' : 'reconnecting');
      const url = buildSocketUrl(token, {
        override: import.meta.env.VITE_WS_URL,
        location: window.location,
      });
      try {
        socket = new WebSocket(url);
      } catch {
        scheduleRetry();
        return;
      }

      socket.onopen = () => {
        attempt = 0;
        setStatus('open');
        clearInterval(pingTimer);
        pingTimer = setInterval(() => {
          if (socket && socket.readyState === WebSocket.OPEN) socket.send('ping');
        }, PING_INTERVAL_MS);
      };

      socket.onmessage = (event) => {
        const msg = parseMessage(event.data);
        if (!msg || msg.type === 'PONG' || msg.type === 'CONNECTED') return;
        const notification = toNotification(msg);
        if (notification) setNotifications((list) => addNotification(list, notification));
        listeners.current.forEach((callback) => {
          try {
            callback(msg);
          } catch (error) {
            console.error('Realtime listener failed', error);
          }
        });
      };

      socket.onclose = () => {
        clearInterval(pingTimer);
        if (!disposed) scheduleRetry();
      };
      socket.onerror = () => {
        // onclose sẽ chạy ngay sau đó và lên lịch kết nối lại.
      };
    };

    const scheduleRetry = () => {
      if (disposed) return;
      setStatus('reconnecting');
      retryTimer = setTimeout(connect, nextDelay(attempt));
      attempt += 1;
    };

    connect();
    return () => {
      disposed = true;
      clearTimers();
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, []);

  const markRead = useCallback(() => setNotifications((list) => markAllRead(list)), []);
  const clearNotifications = useCallback(() => setNotifications([]), []);

  const value = useMemo(
    () => ({ status, notifications, unread: unreadCount(notifications), markRead, clearNotifications, subscribe }),
    [status, notifications, markRead, clearNotifications, subscribe]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
