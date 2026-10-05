/**
 * ConfirmDialog – Unified confirmation modal dialog.
 * Replaces window.confirm() with modern Material You modal.
 */
export default function ConfirmDialog({
  isOpen,
  title = "Xác nhận hành động",
  message = "Bạn có chắc chắn muốn thực hiện hành động này?",
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy bỏ",
  confirmVariant = "error", // "error" | "primary"
  icon = "warning",
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm animate-fadeIn"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden flex flex-col animate-scaleUp">
        <div className="p-space-lg flex flex-col gap-space-md">
          {/* Icon */}
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              confirmVariant === "error"
                ? "bg-error-container text-error"
                : "bg-primary-container text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[26px]">{icon}</span>
          </div>

          {/* Title & Message */}
          <div className="flex flex-col gap-1">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {title}
            </h3>
            <p className="font-body-sm text-body-sm text-secondary leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-space-lg py-space-md bg-surface-container-low flex items-center justify-end gap-space-sm border-t border-outline-variant/20">
          <button
            type="button"
            className="px-4 py-2 bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-surface-container-high transition-colors"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`px-4 py-2 font-body-sm-medium text-body-sm-medium rounded-lg shadow-sm transition-all ${
              confirmVariant === "error"
                ? "bg-error text-on-error hover:opacity-90"
                : "bg-primary text-on-primary hover:bg-primary-dim"
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
