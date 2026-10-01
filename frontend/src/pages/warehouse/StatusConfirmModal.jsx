/**
 * StatusConfirmModal – Dialog xác nhận khi toggle trạng thái kho.
 * Yêu cầu nhập lý do trước khi xác nhận.
 */
export default function StatusConfirmModal({ code, newState, reason, onReasonChange, onConfirm, onCancel }) {
  const message = newState
    ? `Bạn có chắc muốn kích hoạt lại kho <strong>${code}</strong>? Trạng thái sẽ được đổi sang Đang hoạt động.`
    : `Bạn có chắc chắn muốn ngưng kích hoạt kho <strong>${code}</strong>? Các luồng đơn hàng qua kho này sẽ tạm ngưng.`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm animate-fadeIn"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="status-confirm-title"
    >
      <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-space-lg flex flex-col gap-space-md">
          {/* Icon */}
          <div className="w-12 h-12 rounded-full bg-error-container text-error flex items-center justify-center">
            <span className="material-symbols-outlined text-[26px]">warning</span>
          </div>

          {/* Title & Message */}
          <div className="flex flex-col gap-1">
            <h3 id="status-confirm-title" className="font-headline-sm text-headline-sm text-on-surface">
              Xác nhận thay đổi trạng thái
            </h3>
            <p
              className="font-body-sm text-body-sm text-secondary"
              dangerouslySetInnerHTML={{ __html: message }}
            />
          </div>

          {/* Reason input */}
          <div className="flex flex-col gap-1">
            <label className="font-label-default text-label-default text-on-surface font-body-sm-medium">
              Lý do thay đổi trạng thái kho:
            </label>
            <input
              className="w-full h-9 px-3 bg-surface-container-low rounded-lg outline-none font-body-sm text-body-sm focus:bg-surface-container-lowest transition-colors"
              id="input-status-reason"
              placeholder="VD: Bảo trì hệ thống điện, kiểm kê thường niên..."
              type="text"
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-space-lg py-space-md bg-surface-container-low flex items-center justify-end gap-space-sm">
          <button
            className="px-4 py-2 bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium rounded-lg hover:bg-surface-container-high transition-colors"
            onClick={onCancel}
          >
            Hủy bỏ
          </button>
          <button
            className="px-4 py-2 bg-error text-on-error font-body-sm-medium text-body-sm-medium rounded-lg hover:opacity-90 transition-opacity"
            onClick={onConfirm}
          >
            Xác nhận thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
