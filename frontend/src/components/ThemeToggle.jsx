import { useTheme } from '../theme/ThemeProvider';

/**
 * Nút đổi giao diện sáng/tối: một lần bấm là đổi ngay. Biểu tượng mặt trời xoay vào, mặt trăng xoay ra
 * (và ngược lại); màu mới loang ra từ chính nút bấm.
 */
export default function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối';

  function handleClick(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    toggle({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }

  const icon = 'material-symbols-outlined absolute inset-0 grid place-items-center text-[20px] transition-all duration-500 ease-out';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={handleClick}
      title={label}
      aria-label="Giao diện tối"
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-offset-2 ${className}`}
    >
      <span className="relative block h-5 w-5" aria-hidden="true">
        <span className={`${icon} ${isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}>light_mode</span>
        <span className={`${icon} ${isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`}>dark_mode</span>
      </span>
    </button>
  );
}
