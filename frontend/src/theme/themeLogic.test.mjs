import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePreference, oppositeTheme, resolveTheme } from './themeLogic.js';

test('normalizePreference - giá trị lạ thành system', () => {
  assert.equal(normalizePreference('dark'), 'dark');
  assert.equal(normalizePreference('abc'), 'system');
  assert.equal(normalizePreference(null), 'system');
});

test('resolveTheme - system theo hệ điều hành, còn lại theo lựa chọn', () => {
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
});

test('oppositeTheme - một lần bấm luôn đổi chế độ đang hiển thị', () => {
  assert.equal(oppositeTheme('light', false), 'dark');
  assert.equal(oppositeTheme('dark', false), 'light');
  // đang theo hệ thống: hệ thống sáng -> sang tối, hệ thống tối -> sang sáng (không phải bấm hai lần)
  assert.equal(oppositeTheme('system', false), 'dark');
  assert.equal(oppositeTheme('system', true), 'light');
  assert.equal(oppositeTheme('???', true), 'light');
});
