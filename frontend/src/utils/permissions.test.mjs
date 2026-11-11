import test from 'node:test';
import assert from 'node:assert/strict';
import { canManageCatalog, canManageUsers, canOperateStock, normalizeRoles } from './permissionsLogic.js';

test('canManageCatalog: ADMIN và MANAGER được, STAFF và rỗng thì không', () => {
  assert.equal(canManageCatalog({ roles: ['ROLE_ADMIN'] }), true);
  assert.equal(canManageCatalog({ roles: ['MANAGER'] }), true);
  assert.equal(canManageCatalog({ roles: ['ROLE_STAFF'] }), false);
  assert.equal(canManageCatalog({ roles: [] }), false);
  assert.equal(canManageCatalog(null), false);
});

test('normalizeRoles: bỏ tiền tố ROLE_ và viết hoa', () => {
  assert.deepEqual(normalizeRoles({ roles: ['ROLE_staff', 'manager'] }), ['STAFF', 'MANAGER']);
});

test('canOperateStock: ADMIN, MANAGER, STAFF được; VIEWER và rỗng thì không', () => {
  assert.equal(canOperateStock({ roles: ['ROLE_ADMIN'] }), true);
  assert.equal(canOperateStock({ roles: ['MANAGER'] }), true);
  assert.equal(canOperateStock({ roles: ['staff'] }), true);
  assert.equal(canOperateStock({ roles: ['VIEWER'] }), false);
  assert.equal(canOperateStock({ roles: [] }), false);
  assert.equal(canOperateStock(null), false);
});

test('VIEWER không được sửa danh mục', () => {
  assert.equal(canManageCatalog({ roles: ['VIEWER'] }), false);
});

test('canManageUsers: chỉ ADMIN', () => {
  assert.equal(canManageUsers({ roles: ['ROLE_ADMIN'] }), true);
  assert.equal(canManageUsers({ roles: ['MANAGER'] }), false);
  assert.equal(canManageUsers({ roles: ['STAFF'] }), false);
  assert.equal(canManageUsers({ roles: ['VIEWER'] }), false);
  assert.equal(canManageUsers(null), false);
});
