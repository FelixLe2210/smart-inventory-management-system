const STYLES = {
  error: 'bg-error-container text-on-error-container',
  info: 'bg-secondary-container text-on-secondary-container',
  success: 'bg-emerald-50 text-emerald-700',
};
const ICONS = { error: 'error', info: 'info', success: 'check_circle' };

/** Hộp thông báo ngắn trong biểu mẫu. `shakeKey` đổi giá trị thì rung lại để gây chú ý. */
export default function AuthAlert({ kind = 'error', shakeKey, children }) {
  return (
    <div
      key={shakeKey}
      role={kind === 'error' ? 'alert' : 'status'}
      className={`${kind === 'error' ? 'auth-shake ' : ''}flex items-start gap-2 rounded-lg px-3 py-2.5 text-[13px] leading-snug ${STYLES[kind]}`}
    >
      <span className="material-symbols-outlined mt-px text-[18px]" aria-hidden="true">{ICONS[kind]}</span>
      <span>{children}</span>
    </div>
  );
}
