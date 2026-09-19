import axios from 'axios';
import { ApiClientError } from './ApiClientError';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const ACCESS_TOKEN_STORAGE_KEY = 'smart_inventory_access_token';

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the access token (once auth-protected endpoints exist) to every request.
httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Every backend response is wrapped as { success, data, error, timestamp }.
// On success we unwrap straight to that envelope; on failure we normalize
// into ApiClientError so calling code has one shape to handle.
httpClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      // Server responded with a non-2xx status. Backend follows the
      // ApiResponse envelope, so error details live in response.data.error.
      const body = error.response.data;
      const apiError = body?.error;
sangle
      const message = typeof apiError === 'string'
        ? apiError
        : apiError?.message || body?.message || 'Something went wrong. Please try again.';
      return Promise.reject(
        new ApiClientError({
          code: apiError?.code || 'UNKNOWN_ERROR',
          message,
          status: error.response.status,
          details: typeof apiError === 'string' ? null : apiError?.details || null,

      return Promise.reject(
        new ApiClientError({
          code: apiError?.code || 'UNKNOWN_ERROR',
          message: apiError?.message || 'Something went wrong. Please try again.',
          status: error.response.status,
          details: apiError?.details || null,
 master
        })
      );
    }

    if (error.request) {
      // Request was sent but no response came back: server down, wrong URL,
      // CORS block, or no network. This is the "basic connection error" case.
      return Promise.reject(
        new ApiClientError({
          code: 'NETWORK_ERROR',
          message: 'Unable to reach the server. Check your connection and that the backend is running.',
        })
      );
    }

    // Something failed while building the request itself.
    return Promise.reject(
      new ApiClientError({
        code: 'REQUEST_SETUP_ERROR',
        message: error.message || 'Unexpected error while preparing the request.',
      })
    );
  }
);

const USER_STORAGE_KEY = 'smart_inventory_current_user';

export function setAccessToken(token) {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }
}

export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export function getCurrentUser() {
  const user = localStorage.getItem(USER_STORAGE_KEY);
  try {
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function clearCurrentUser() {
  localStorage.removeItem(USER_STORAGE_KEY);
}

