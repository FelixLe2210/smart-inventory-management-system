import { httpClient } from './httpClient';

 sangle
export async function register({ username, password, fullName, email }) {
  return httpClient.post('/auth/register', {
    username,
    password,
    fullName,
    email,
  });
}


 master
/**
 * @param {string} usernameOrEmail
 * @param {string} password
 * @returns {Promise<{id:number, username:string, email:string, roles:string[], accessToken:string}>}
 * @throws {import('./ApiClientError').ApiClientError}
 */
export async function login(usernameOrEmail, password) {
 sangle
  return httpClient.post('/auth/login', { usernameOrEmail, password });

  const envelope = await httpClient.post('/auth/login', { usernameOrEmail, password });
  return envelope.data;
 master
}
