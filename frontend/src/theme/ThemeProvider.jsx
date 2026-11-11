import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { THEME_STORAGE_KEY, normalizePreference, oppositeTheme, resolveTheme } from './themeLogic';

const ThemeContext = createContext({
  preference: 'system',
  theme: 'light',
  toggle: () => {},
  setPreference: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

const query = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null);

function readPreference() {
  try {
    return normalizePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Giữ lựa chọn giao diện, gắn lớp `dark` lên <html> và nhớ lựa chọn giữa các lần mở.
 * Bấm nút đổi luôn chuyển ngay sang chế độ ngược lại; trình duyệt hỗ trợ View Transitions thì màu mới
 * loang ra từ vị trí nút bấm, còn lại thì chuyển màu mượt bằng CSS transition.
 */
export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(readPreference);
  const [systemDark, setSystemDark] = useState(() => !!query()?.matches);

  useEffect(() => {
    const mq = query();
    if (!mq) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const theme = resolveTheme(preference, systemDark);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const setPreference = useCallback((value, origin) => {
    const next = normalizePreference(value);
    const root = document.documentElement;
    const nextIsDark = resolveTheme(next, !!query()?.matches) === 'dark';

    const commit = () => {
      // Đổi lớp ngay trong lúc chụp khung hình để chuyển cảnh thấy đúng giao diện mới.
      root.classList.toggle('dark', nextIsDark);
      flushSync(() => setPreferenceState(next));
    };

    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* không lưu được thì chỉ áp dụng cho phiên này */
    }

    if (typeof document.startViewTransition === 'function' && !prefersReducedMotion()) {
      const x = origin?.x ?? window.innerWidth / 2;
      const y = origin?.y ?? window.innerHeight / 2;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      const transition = document.startViewTransition(commit);
      transition.ready
        .then(() => {
          root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
            { duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
          );
        })
        .catch(() => {});
      return;
    }

    if (!prefersReducedMotion()) {
      root.classList.add('theme-transition'); // dự phòng: chuyển màu mượt khi không có View Transitions
      setTimeout(() => root.classList.remove('theme-transition'), 350);
    }
    commit();
  }, []);

  /** Một lần bấm: sang chế độ ngược với chế độ đang hiển thị. `origin` = {x, y} nơi loang màu bắt đầu. */
  const toggle = useCallback(
    (origin) => setPreference(oppositeTheme(preference, systemDark), origin),
    [preference, systemDark, setPreference]
  );

  const value = useMemo(() => ({ preference, theme, toggle, setPreference }), [preference, theme, toggle, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
