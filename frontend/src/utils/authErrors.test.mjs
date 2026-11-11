import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ERROR, authErrorMessage } from './authErrors.js';

test('mã lỗi đã biết được dịch sang tiếng Việt', () => {
  assert.match(authErrorMessage({ code: 'INVALID_CREDENTIALS' }), /chưa đúng/);
  assert.match(authErrorMessage({ code: 'USERNAME_TAKEN' }), /đã có người dùng/);
  assert.match(authErrorMessage({ code: 'NETWORK_ERROR' }), /backend/);
});

test('OTP_TOO_SOON lấy số giây từ thông điệp của backend', () => {
  const err = { code: 'OTP_TOO_SOON', message: 'Please wait 17 seconds before asking for a new code.' };
  assert.equal(authErrorMessage(err), 'Vui lòng đợi 17 giây để nhận mã mới.');
  assert.match(authErrorMessage({ code: 'OTP_TOO_SOON', message: '' }), /đợi/);
});

test('VALIDATION_ERROR hiện chi tiết đầu tiên', () => {
  const err = { code: 'VALIDATION_ERROR', details: ['code: Code must be 6 digits'] };
  assert.match(authErrorMessage(err), /Code must be 6 digits/);
});

test('mã lạ hoặc không có lỗi dùng câu mặc định', () => {
  assert.equal(authErrorMessage({ code: 'WHATEVER' }), DEFAULT_ERROR);
  assert.equal(authErrorMessage(null), DEFAULT_ERROR);
  assert.equal(authErrorMessage(undefined, 'xin lỗi'), 'xin lỗi');
});

test('TOO_MANY_ATTEMPTS đổi số giây thành số phút', () => {
  const err = { code: 'TOO_MANY_ATTEMPTS', message: 'Too many failed sign-in attempts. Try again in 840 seconds.' };
  assert.match(authErrorMessage(err), /14 phút/);
  assert.match(authErrorMessage({ code: 'TOO_MANY_ATTEMPTS', message: '' }), /ít phút/);
});
