import test from 'node:test';
import assert from 'node:assert/strict';
import { navGroupsFor, titleFor } from './navConfig.js';

const paths = (user) => navGroupsFor(user).flatMap((g) => g.items.map((i) => i.to));

test('ADMIN thấy mục Người dùng và vai trò', () => {
  assert.ok(paths({ roles: ['ROLE_ADMIN'] }).includes('/users'));
});

test('MANAGER, STAFF, VIEWER không thấy mục quản trị và nhóm Quản trị biến mất', () => {
  for (const role of ['MANAGER', 'STAFF', 'VIEWER']) {
    assert.ok(!paths({ roles: [role] }).includes('/users'), role);
    assert.ok(!navGroupsFor({ roles: [role] }).some((g) => g.title === 'Quản trị'), role);
  }
});

test('VIEWER vẫn không thấy Nhập, Xuất, Chuyển kho', () => {
  const viewer = paths({ roles: ['VIEWER'] });
  for (const p of ['/inbound', '/outbound', '/transfer']) assert.ok(!viewer.includes(p), p);
  assert.ok(viewer.includes('/inventory'));
});

test('tiêu đề trang Người dùng thuộc nhóm Quản trị', () => {
  assert.deepEqual(titleFor('/users'), { title: 'Người dùng và vai trò', group: 'Quản trị' });
});
