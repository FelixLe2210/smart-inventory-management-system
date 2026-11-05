import { httpClient } from './httpClient';
import { ApiClientError } from './ApiClientError';
import { isEndpointMissing } from '../utils/apiFallback';

export const RECOMMENDATION_ENDPOINTS = {
  list: '/reorder/recommendations',
  detail: (id) => `/reorder/recommendations/${encodeURIComponent(id)}`,
  generate: '/reorder/recommendations',
};

function getData(response) {
  if (response?.success === false) {
    throw new Error(response.error?.message || 'Không thể tải đề xuất nhập hàng.');
  }
  return response?.data ?? response;
}

function normalizeList(payload) {
  const data = getData(payload);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.recommendations)) return data.recommendations;
  throw new Error('Dữ liệu danh sách đề xuất không đúng định dạng.');
}

function reportEndpointError(error, endpoint) {
  if (isEndpointMissing(error)) {
    throw new ApiClientError({
      code: 'REORDER_API_NOT_IMPLEMENTED',
      message: `Backend chưa triển khai API ${endpoint}. Hãy triển khai endpoint reorder hoặc kết nối đúng backend.`,
      status: error.status,
      details: error.details,
    });
  }
  throw error;
}

export const recommendationApi = {
  async getAll(params = {}) {
    try {
      const response = await httpClient.get(RECOMMENDATION_ENDPOINTS.list, { params });
      return normalizeList(response);
    } catch (error) {
      reportEndpointError(error, `GET /api${RECOMMENDATION_ENDPOINTS.list}`);
    }
  },

  async getById(id) {
    if (id === undefined || id === null || id === '') {
      throw new Error('Thiếu mã đề xuất.');
    }
    try {
      const response = await httpClient.get(RECOMMENDATION_ENDPOINTS.detail(id));
      const data = getData(response);
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('Dữ liệu chi tiết đề xuất không đúng định dạng.');
      }
      return data;
    } catch (error) {
      reportEndpointError(error, `GET /api${RECOMMENDATION_ENDPOINTS.detail(id)}`);
    }
  },

  async generate(params = {}) {
    try {
      const response = await httpClient.post(RECOMMENDATION_ENDPOINTS.generate, params);
      return getData(response);
    } catch (error) {
      reportEndpointError(error, `POST /api${RECOMMENDATION_ENDPOINTS.generate}`);
    }
  },
};
