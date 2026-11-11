/** Đổi mã lỗi của backend/SDK thành câu tiếng Việt dễ hiểu cho trang đăng nhập. */

const MESSAGES = {
  INVALID_CREDENTIALS: 'Tên đăng nhập hoặc mật khẩu chưa đúng.',
  ACCOUNT_DISABLED: 'Tài khoản này đã bị vô hiệu hóa. Liên hệ quản trị viên.',
  USERNAME_TAKEN: 'Tên đăng nhập này đã có người dùng.',
  EMAIL_TAKEN: 'Email này đã được dùng cho một tài khoản khác.',
  WEAK_PASSWORD: 'Mật khẩu cần ít nhất 8 ký tự, có cả chữ và số.',
  REGISTRATION_DISABLED: 'Hệ thống đang tắt đăng ký tự do. Hãy nhờ quản trị viên tạo tài khoản.',
  PROVIDER_NOT_CONFIGURED: 'Cách đăng nhập này chưa được bật trên máy chủ.',
  SOCIAL_VERIFY_FAILED: 'Không xác minh được tài khoản. Hãy thử lại.',
  UNKNOWN_PROVIDER: 'Cách đăng nhập này chưa được hỗ trợ.',
  INVALID_PHONE: 'Số điện thoại chưa đúng. Ví dụ: 0912 345 678.',
  PHONE_DISABLED: 'Đăng nhập bằng số điện thoại đang tắt.',
  OTP_INVALID: 'Mã chưa đúng hoặc đã hết hạn.',
  OTP_TOO_MANY_ATTEMPTS: 'Bạn nhập sai quá nhiều lần. Hãy xin mã mới.',
  OTP_BUSY: 'Hệ thống đang bận. Thử lại sau vài phút.',
  NETWORK_ERROR: 'Không kết nối được máy chủ. Kiểm tra backend đã chạy chưa.',
  SDK_LOAD_FAILED: 'Không tải được dịch vụ đăng nhập. Kiểm tra kết nối Internet rồi thử lại.',
  POPUP_CLOSED: 'Bạn đã đóng cửa sổ đăng nhập trước khi hoàn tất.',
  POPUP_BLOCKED: 'Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép cửa sổ bật lên cho trang này.',
};

export const DEFAULT_ERROR = 'Có lỗi xảy ra. Vui lòng thử lại.';

/** Câu hiển thị cho một lỗi (ApiClientError hoặc Error có `code`). */
export function authErrorMessage(error, fallback = DEFAULT_ERROR) {
  if (!error) return fallback;
  if (error.code === 'OTP_TOO_SOON') {
    const seconds = /(\d+)\s+seconds/.exec(error.message || '');
    return seconds ? `Vui lòng đợi ${seconds[1]} giây để nhận mã mới.` : 'Bạn vừa xin mã. Vui lòng đợi ít giây rồi thử lại.';
  }
  if (error.code === 'TOO_MANY_ATTEMPTS') {
    const seconds = /(\d+)\s+seconds/.exec(error.message || '');
    const wait = seconds ? Math.ceil(Number(seconds[1]) / 60) : null;
    return wait ? `Bạn nhập sai quá nhiều lần. Thử lại sau khoảng ${wait} phút.` : 'Bạn nhập sai quá nhiều lần. Hãy thử lại sau ít phút.';
  }
  if (error.code === 'VALIDATION_ERROR' && Array.isArray(error.details) && error.details.length > 0) {
    return `Thông tin chưa hợp lệ: ${error.details[0]}`;
  }
  return MESSAGES[error.code] || fallback;
}
