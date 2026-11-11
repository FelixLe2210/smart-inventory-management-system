// Tiện ích dùng chung cho các script kiểm thử e2e (Node 18+; WebSocket cần Node 22+).
export const BASE = process.env.API_BASE || 'http://localhost:8080';
export const USER = process.env.E2E_USER || 'admin';
export const PASS = process.env.E2E_PASS || 'Admin@123';

export async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* không phải JSON */ }
  return { status: res.status, json };
}

export async function login() {
  const r = await api('/api/auth/login', { method: 'POST', body: { usernameOrEmail: USER, password: PASS } });
  const token = r.json?.data?.accessToken;
  if (!token) throw new Error(`Đăng nhập thất bại (${r.status}): ${JSON.stringify(r.json)}`);
  return token;
}

let failures = 0;
export function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`);
  if (!ok) failures += 1;
}
export function finish() {
  console.log(failures === 0 ? '\nTất cả kiểm tra đạt.' : `\n${failures} kiểm tra KHÔNG đạt.`);
  process.exit(failures === 0 ? 0 : 1);
}
