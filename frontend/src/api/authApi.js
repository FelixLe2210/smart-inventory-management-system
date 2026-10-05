import { httpClient } from './httpClient';

/**
 * @param {string} usernameOrEmail
 * @param {string} password
 * @returns {Promise<{id:number, username:string, email:string, roles:string[], accessToken:string}>}
 * @throws {import('./ApiClientError').ApiClientError}
 */
export async function login(usernameOrEmail, password) {
  const envelope = await httpClient.post('/auth/login', { usernameOrEmail, password });
  return envelope.data;
}
