import test from 'node:test';
import assert from 'node:assert/strict';
import { filterUsers, isSelf, primaryRole, roleLabel, summarizeUsers, userErrorMessage } from './userAdmin.js';

const users = [
  { id: 1, username: 'admin', email: 'admin@example.com', phone: null, active: true, roles: ['ADMIN'] },
  { id: 2, username: 'lan', email: 'lan@example.com', phone: '+84901234567', active: true, roles: ['VIEWER'] },
  { id: 3, username: 'minh', email: 'minh@kho.vn', phone: null, active: false, roles: ['STAFF'] },
  { id: 4, username: 'hoa', email: 'hoa@kho.vn', phone: null, active: true, roles: ['STAFF', 'MANAGER'] },
];

test('roleLabel dịch vai trò đã biết và giữ nguyên vai trò lạ', () => {
  assert.equal(roleLabel('STAFF'), 'Nhân viên kho');
  assert.equal(roleLabel('PROCUREMENT'), 'PROCUREMENT');
  assert.equal(roleLabel(''), 'Chưa có vai trò');
});

test('primaryRole chọn vai trò cao nhất', () => {
  assert.equal(primaryRole(users[3]), 'MANAGER');
  assert.equal(primaryRole({ roles: [] }), '');
  assert.equal(primaryRole(null), '');
});

test('filterUsers tìm theo tên, email, số điện thoại', () => {
  assert.deepEqual(filterUsers(users, { search: 'LAN' }).map((u) => u.id), [2]);
  assert.deepEqual(filterUsers(users, { search: 'kho.vn' }).map((u) => u.id), [3, 4]);
  assert.deepEqual(filterUsers(users, { search: '0901234' }).map((u) => u.id), [2]);
  assert.deepEqual(filterUsers(users, { search: '+84 901' }).map((u) => u.id), [2]);
  assert.deepEqual(filterUsers(users, { search: '9999' }).map((u) => u.id), []);
});

test('filterUsers lọc theo vai trò chính và trạng thái', () => {
  assert.deepEqual(filterUsers(users, { role: 'STAFF' }).map((u) => u.id), [3]);
  assert.deepEqual(filterUsers(users, { status: 'disabled' }).map((u) => u.id), [3]);
  assert.deepEqual(filterUsers(users, { status: 'active', role: 'MANAGER' }).map((u) => u.id), [4]);
  assert.equal(filterUsers(users).length, 4);
  assert.deepEqual(filterUsers(null), []);
});

test('summarizeUsers đếm theo vai trò chính và số tài khoản bị khóa', () => {
  assert.deepEqual(summarizeUsers(users), {
    total: 4,
    byRole: { ADMIN: 1, MANAGER: 1, STAFF: 1, VIEWER: 1 },
    disabled: 1,
  });
});

test('isSelf nhận ra chính mình theo id hoặc tên đăng nhập', () => {
  assert.equal(isSelf(users[0], { id: 1, username: 'x' }), true);
  assert.equal(isSelf(users[0], { username: 'admin' }), true);
  assert.equal(isSelf(users[1], { id: 1, username: 'admin' }), false);
  assert.equal(isSelf(users[1], null), false);
});

test('userErrorMessage dịch mã lỗi của backend', () => {
  assert.match(userErrorMessage({ code: 'LAST_ADMIN' }), /ít nhất một quản trị viên/);
  assert.match(userErrorMessage({ code: 'CANNOT_MODIFY_SELF' }), /tự đổi/);
  assert.equal(userErrorMessage({ code: 'X' }, 'lỗi'), 'lỗi');
  assert.match(userErrorMessage(null), /Vui lòng thử lại/);
});
