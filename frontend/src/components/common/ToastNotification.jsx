/**
 * ToastNotification – Unified toast alert for Smart Inventory Management System.
 * Displays temporary status feedback at the bottom-right corner.
 */
export default function ToastNotification({ visible, text, icon = "check_circle" }) {
  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-space-sm px-4 py-3 rounded-xl shadow-xl bg-inverse-surface text-inverse-on-surface font-body-sm text-body-sm transition-all duration-300 pointer-events-none ${
        visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-16 opacity-0 scale-95"
      }`}
      role="status"
      aria-live="polite"
    >
      <span className="material-symbols-outlined text-[20px] text-tertiary-fixed">{icon}</span>
      <span className="font-body-sm-medium text-body-sm-medium">{text}</span>
    </div>
  );
}
