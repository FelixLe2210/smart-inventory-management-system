import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPhone,
  isPlaceholderEmail,
  normalizePhone,
  passwordChecks,
  passwordStrength,
  validateEmail,
  validatePassword,
  validateRegister,
  validateUsername,
} from './authValidation.js';

test('validateUsername - 3-50 ký tự hợp lệ', () => {
  assert.equal(validateUsername('new.user_01'), null);
  assert.ok(validateUsername(''));
  assert.ok(validateUsername('ab'));
  assert.ok(validateUsername('có dấu'));
  assert.ok(validateUsername('a b c'));
  assert.ok(validateUsername('x'.repeat(51)));
});

test('validateEmail - định dạng cơ bản', () => {
  assert.equal(validateEmail(' a@b.co '), null);
  assert.ok(validateEmail(''));
  assert.ok(validateEmail('abc'));
  assert.ok(validateEmail('a@b'));
});

test('validatePassword - tối thiểu 8 ký tự, có chữ và số, tối đa 72', () => {
  assert.equal(validatePassword('Passw0rd'), null);
  assert.equal(validatePassword('mật khẩu 123'), null);
  assert.ok(validatePassword(''));
  assert.ok(validatePassword('abc123'));
  assert.ok(validatePassword('abcdefgh'));
  assert.ok(validatePassword('12345678'));
  assert.ok(validatePassword(`a1${'x'.repeat(71)}`));
});

test('passwordChecks - từng điều kiện', () => {
  assert.deepEqual(passwordChecks('abc'), { length: false, letter: true, digit: false });
  assert.deepEqual(passwordChecks('abcd1234'), { length: true, letter: true, digit: true });
});

test('passwordStrength - điểm tăng theo độ dài và độ đa dạng', () => {
  assert.equal(passwordStrength('').score, 0);
  assert.equal(passwordStrength('abc').score, 0);
  assert.equal(passwordStrength('abcdefgh').score, 1); // thiếu số: không vượt quá 1
  assert.equal(passwordStrength('abcd1234').score, 2);
  assert.equal(passwordStrength('Abcd1234xyz').score, 3);
  assert.equal(passwordStrength('Abcd1234xyz!').score, 4);
  assert.equal(passwordStrength('Abcd1234xyz!').label, 'Mạnh');
});

test('validateRegister - gom lỗi theo ô và kiểm tra nhập lại', () => {
  assert.deepEqual(validateRegister({ username: 'minh', email: 'm@x.vn', password: 'Passw0rd' }), {});
  const bad = validateRegister({ username: 'a', email: 'x', password: 'abc', confirm: '' });
  assert.deepEqual(Object.keys(bad).sort(), ['email', 'password', 'username']);
  const mismatch = validateRegister({ username: 'minh', email: 'm@x.vn', password: 'Passw0rd', confirm: 'Passw0re' });
  assert.deepEqual(Object.keys(mismatch), ['confirm']);
});

test('normalizePhone - khớp với backend', () => {
  assert.equal(normalizePhone('0912 345 678'), '+84912345678');
  assert.equal(normalizePhone('+84 912-345-678'), '+84912345678');
  assert.equal(normalizePhone('84912345678'), '+84912345678');
  assert.equal(normalizePhone('0084912345678'), '+84912345678');
  assert.equal(normalizePhone('+1 (415) 555-2671'), '+14155552671');
  for (const bad of [null, undefined, '', 'abc', '12345', '0212345678', '+84123456789', '+0123456789']) {
    assert.equal(normalizePhone(bad), null, String(bad));
  }
});

test('formatPhone và isPlaceholderEmail', () => {
  assert.equal(formatPhone('+84912345678'), '+84 912 345 678');
  assert.equal(formatPhone('+14155552671'), '+14155552671');
  assert.equal(isPlaceholderEmail('phone_849@users.smartinventory.local'), true);
  assert.equal(isPlaceholderEmail('a@b.com'), false);
  assert.equal(isPlaceholderEmail(null), false);
});
