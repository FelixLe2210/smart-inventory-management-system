import { httpClient, setAccessToken, setCurrentUser } from './httpClient';

/**
 * Mọi hàm trả về phần `data` của phong bì phản hồi; lỗi được ném dưới dạng ApiClientError.
 * @typedef {{id:number, username:string, email:string, roles:string[], accessToken:string}} Session
 */

/** @returns {Promise<Session>} */
export async function login(usernameOrEmail, password) {
  const envelope = await httpClient.post('/auth/login', { usernameOrEmail, password });
  return envelope.data;
}

/** Đăng ký bằng email + mật khẩu; backend trả luôn phiên đăng nhập. @returns {Promise<Session>} */
export async function register({ username, email, password }) {
  const envelope = await httpClient.post('/auth/register', { username, email, password });
  return envelope.data;
}

/** Cách đăng nhập máy chủ đang bật: { googleClientId, facebookAppId, phoneEnabled, registrationEnabled }. */
export async function getAuthProviders() {
  const envelope = await httpClient.get('/auth/providers');
  return envelope.data;
}

/** @param {string} accessToken token Google lấy ở trình duyệt. @returns {Promise<Session>} */
export async function loginWithGoogle(accessToken) {
  const envelope = await httpClient.post('/auth/google', { token: accessToken });
  return envelope.data;
}

/** @param {string} accessToken token Facebook lấy ở trình duyệt. @returns {Promise<Session>} */
export async function loginWithFacebook(accessToken) {
  const envelope = await httpClient.post('/auth/facebook', { token: accessToken });
  return envelope.data;
}

/** Gửi mã 6 số tới điện thoại. @returns {Promise<{phone:string, expiresInSeconds:number, resendAfterSeconds:number, devCode?:string}>} */
export async function requestPhoneOtp(phone) {
  const envelope = await httpClient.post('/auth/phone/request-otp', { phone });
  return envelope.data;
}

/** Kiểm tra mã; số chưa có tài khoản sẽ được tạo tài khoản. @returns {Promise<Session>} */
export async function verifyPhoneOtp(phone, code) {
  const envelope = await httpClient.post('/auth/phone/verify', { phone, code });
  return envelope.data;
}

/** Lưu phiên vừa đăng nhập (token và thông tin người dùng) cho các trang sau. */
export function saveSession(session) {
  if (!session?.accessToken) throw new Error('Backend không trả về access token hợp lệ.');
  setAccessToken(session.accessToken);
  setCurrentUser(session);
  return session;
}
