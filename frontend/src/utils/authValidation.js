/** Kiểm tra dữ liệu ở trang đăng nhập/đăng ký. Luật phải khớp với backend (RegisterRequest, PhoneNumbers). */

export const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,50}$/;
export const PLACEHOLDER_EMAIL_SUFFIX = '@users.smartinventory.local';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateUsername(value) {
  const v = (value ?? '').trim();
  if (!v) return 'Nhập tên đăng nhập.';
  if (!USERNAME_PATTERN.test(v)) return 'Tên đăng nhập gồm 3-50 ký tự: chữ không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.';
  return null;
}

export function validateEmail(value) {
  const v = (value ?? '').trim();
  if (!v) return 'Nhập email.';
  if (v.length > 255 || !EMAIL_PATTERN.test(v)) return 'Email chưa đúng định dạng.';
  return null;
}

/** Các điều kiện mật khẩu, để hiện dấu tích từng điều kiện khi người dùng gõ. */
export function passwordChecks(password) {
  const p = password ?? '';
  return {
    length: p.length >= 8 && p.length <= 72,
    letter: /\p{L}/u.test(p),
    digit: /\d/.test(p),
  };
}

export function validatePassword(password) {
  const p = password ?? '';
  if (!p) return 'Nhập mật khẩu.';
  if (p.length > 72) return 'Mật khẩu tối đa 72 ký tự.';
  const checks = passwordChecks(p);
  if (!checks.length) return 'Mật khẩu cần ít nhất 8 ký tự.';
  if (!checks.letter || !checks.digit) return 'Mật khẩu cần có cả chữ và số.';
  return null;
}

/** Độ mạnh mật khẩu: score 0-4 và nhãn. Chỉ để gợi ý; điều kiện bắt buộc nằm ở validatePassword. */
export function passwordStrength(password) {
  const p = password ?? '';
  if (!p) return { score: 0, label: '' };
  const checks = passwordChecks(p);
  let score = 0;
  if (p.length >= 8) score += 1;
  if (checks.letter && checks.digit) score += 1;
  if (p.length >= 12) score += 1;
  if ((/\p{Lu}/u.test(p) && /\p{Ll}/u.test(p)) || /[^\p{L}\d\s]/u.test(p)) score += 1;
  if (!checks.length || !checks.letter || !checks.digit) score = Math.min(score, 1);
  const labels = ['Rất yếu', 'Yếu', 'Khá', 'Tốt', 'Mạnh'];
  return { score, label: labels[score] };
}

/** Trả về object lỗi theo từng ô; rỗng nghĩa là hợp lệ. */
export function validateRegister({ username, email, password, confirm }) {
  const errors = {};
  const u = validateUsername(username);
  if (u) errors.username = u;
  const e = validateEmail(email);
  if (e) errors.email = e;
  const p = validatePassword(password);
  if (p) errors.password = p;
  if (!p && confirm !== undefined && password !== confirm) errors.confirm = 'Mật khẩu nhập lại chưa khớp.';
  return errors;
}

/** Chuẩn hóa số điện thoại về E.164 (+84912345678); null nếu không hợp lệ. Khớp PhoneNumbers.normalize ở backend. */
export function normalizePhone(raw) {
  if (typeof raw !== 'string') return null;
  let s = raw.trim().replace(/[\s().-]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (s.startsWith('+')) {
    // đã ở dạng quốc tế
  } else if (s.startsWith('0')) {
    s = `+84${s.slice(1)}`;
  } else if (s.startsWith('84')) {
    s = `+${s}`;
  } else {
    return null;
  }
  const valid = s.startsWith('+84') ? /^\+84[35789]\d{8}$/.test(s) : /^\+[1-9]\d{7,14}$/.test(s);
  return valid ? s : null;
}

/** Hiển thị số E.164 dễ đọc: +84912345678 -> +84 912 345 678. */
export function formatPhone(e164) {
  if (typeof e164 !== 'string') return '';
  const m = /^\+84(\d{3})(\d{3})(\d{3})$/.exec(e164);
  return m ? `+84 ${m[1]} ${m[2]} ${m[3]}` : e164;
}

/** Tài khoản tạo bằng số điện thoại/Facebook không có email thật. */
export function isPlaceholderEmail(email) {
  return typeof email === 'string' && email.endsWith(PLACEHOLDER_EMAIL_SUFFIX);
}
