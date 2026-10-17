/**
 * Chuẩn hoá lỗi giao dịch kho (nhập / xuất / chuyển kho).
 * Sprint 5 - M4 (Sprint5-15 Transaction Error Handling)
 *
 * Nhận ApiClientError (hoặc object có code / status / message / details) và trả về
 * thông tin đủ để giao diện hiển thị đúng chỗ, đúng nội dung, đúng hành động tiếp theo.
 * Cố ý KHÔNG import axios / httpClient để chạy được bằng `node --test`.
 *
 * Mã lỗi lấy từ backend: InventoryService, GlobalExceptionHandler (xem docs/api/STOCK_MOVEMENT_TESTING.md).
 */

/**
 * code -> cách hiển thị.
 *  - message : câu cố định tiếng Việt. Bỏ trống = dùng nguyên message của server
 *              (dùng cho lỗi server đã ghi sẵn số liệu cụ thể, ví dụ tồn khả dụng).
 *  - field   : tên ô trong form để gắn lỗi.
 *  - retryable: bấm "thử lại" có thể thành công.
 *  - reload  : dữ liệu trên màn hình có thể đã cũ, nên tải lại.
 *  - relogin : cần đăng nhập lại.
 */
export const TRANSACTION_ERROR_RULES = {
  NETWORK_ERROR: {
    message: 'Không kết nối được máy chủ. Hãy kiểm tra mạng và đảm bảo backend đang chạy rồi thử lại.',
    retryable: true,
  },
  REQUEST_SETUP_ERROR: { message: 'Không thể gửi yêu cầu. Hãy tải lại trang và thử lại.' },
  UNAUTHORIZED: { message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', relogin: true },
  ACCOUNT_DISABLED: { message: 'Tài khoản đã bị vô hiệu hóa. Hãy liên hệ quản trị viên.', relogin: true },
  FORBIDDEN: { message: 'Bạn không có quyền thực hiện thao tác này.' },

  TRANSACTION_CONFLICT: {
    message: 'Kho đang xử lý một giao dịch khác cùng lúc. Hãy đợi vài giây rồi thử lại.',
    retryable: true,
    reload: true,
  },
  DATA_INTEGRITY_VIOLATION: {
    message: 'Giao dịch vi phạm ràng buộc dữ liệu (ví dụ tồn kho âm hoặc dữ liệu đang được tham chiếu). Hãy tải lại dữ liệu và kiểm tra lại.',
    reload: true,
  },
  STOCK_INCONSISTENT: {
    message: 'Dữ liệu tồn kho của dòng này không nhất quán (giữ chỗ lớn hơn tồn hiện tại). Hãy báo quản trị viên kiểm kê lại trước khi giao dịch.',
  },

  INSUFFICIENT_STOCK: { field: 'quantity', reload: true },
  INSUFFICIENT_AVAILABLE_STOCK: { field: 'quantity', reload: true },
  INVALID_QUANTITY: { field: 'quantity' },
  STOCK_LIMIT_EXCEEDED: { field: 'quantity', message: 'Số lượng làm tồn kho vượt quá giới hạn cho phép.' },
  SAME_WAREHOUSE_TRANSFER: {
    field: 'destinationWarehouseId',
    message: 'Kho nguồn và kho đích không được trùng nhau.',
  },

  PRODUCT_NOT_ACTIVE: { field: 'productId', reload: true },
  PRODUCT_NOT_FOUND: { field: 'productId', reload: true },
  WAREHOUSE_NOT_ACTIVE: { reload: true },
  WAREHOUSE_NOT_FOUND: { field: 'destinationWarehouseId', reload: true },
  INVENTORY_NOT_FOUND: {
    message: 'Dòng tồn kho nguồn không còn tồn tại (có thể vừa bị xóa). Dữ liệu đã được tải lại, hãy chọn lại.',
    reload: true,
  },

  INTERNAL_ERROR: {
    message: 'Hệ thống gặp lỗi khi xử lý giao dịch. Hãy thử lại sau; nếu lỗi lặp lại, báo cho quản trị viên.',
    retryable: true,
  },
};

/** "field: nội dung" (định dạng details của backend) -> { field: nội dung } */
export function parseFieldDetails(details) {
  const fieldErrors = {};
  if (!Array.isArray(details)) return fieldErrors;
  details.forEach((d) => {
    const text = String(d);
    const idx = text.indexOf(': ');
    if (idx > 0) {
      const field = text.slice(0, idx).trim();
      const msg = text.slice(idx + 2).trim();
      if (field && msg && !fieldErrors[field]) fieldErrors[field] = msg;
    }
  });
  return fieldErrors;
}

function ruleCodeFor(err) {
  const code = err?.code;
  if (code && TRANSACTION_ERROR_RULES[code]) return code;
  const status = err?.status;
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status >= 500) return 'INTERNAL_ERROR';
  return null;
}

/**
 * @param {{code?:string,status?:number|null,message?:string,details?:string[]|null}} err
 * @returns {{code:string,status:number|null,message:string,field:string|null,fieldErrors:Record<string,string>,retryable:boolean,reload:boolean,relogin:boolean}}
 */
export function mapTransactionError(err) {
  const code = err?.code || 'UNKNOWN_ERROR';
  const status = err?.status ?? null;
  const serverMessage = err?.message || 'Thao tác thất bại. Vui lòng thử lại.';

  // Lỗi kiểm tra dữ liệu: gắn từng ô theo details của backend
  if (code === 'VALIDATION_ERROR') {
    const fieldErrors = parseFieldDetails(err?.details);
    const hasFields = Object.keys(fieldErrors).length > 0;
    return {
      code, status, field: null, fieldErrors,
      message: hasFields ? 'Thông tin chưa hợp lệ, hãy kiểm tra các ô được đánh dấu.' : serverMessage,
      retryable: false, reload: false, relogin: false,
    };
  }

  const ruleKey = ruleCodeFor(err);
  const rule = ruleKey ? TRANSACTION_ERROR_RULES[ruleKey] : null;
  if (!rule) {
    return { code, status, field: null, fieldErrors: {}, message: serverMessage, retryable: false, reload: false, relogin: false };
  }
  return {
    code: ruleKey,
    status,
    field: rule.field || null,
    fieldErrors: {},
    message: rule.message || serverMessage,
    retryable: !!rule.retryable,
    reload: !!rule.reload,
    relogin: !!rule.relogin,
  };
}

/** Thông tin lỗi -> object lỗi để form hiển thị ({ tenO: 'nội dung' } hoặc { general }). */
export function toFormErrors(info) {
  if (info.field) return { [info.field]: info.message };
  if (Object.keys(info.fieldErrors).length > 0) return { ...info.fieldErrors };
  return { general: info.message };
}
