import axios from 'axios';
import { ApiClientError } from './ApiClientError';
import { validateForecastResponse } from '../utils/forecast';

const AI_SERVICE_BASE_URL =
  import.meta.env.VITE_AI_SERVICE_BASE_URL || 'http://localhost:8000';

const aiServiceClient = axios.create({
  baseURL: AI_SERVICE_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

function normalizeRequestError(error) {
  if (error instanceof ApiClientError) return error;

  if (error.response) {
    const body = error.response.data;
    return new ApiClientError({
      code: body?.error?.code || body?.code || 'FORECAST_REQUEST_FAILED',
      message:
        body?.error?.message ||
        body?.detail ||
        body?.message ||
        'Không thể tạo dự báo. Vui lòng thử lại.',
      status: error.response.status,
      details: body?.error?.details || null,
    });
  }

  if (error.request) {
    return new ApiClientError({
      code: 'AI_SERVICE_UNAVAILABLE',
      message:
        'Không thể kết nối AI service. Hãy kiểm tra dịch vụ đang chạy và VITE_AI_SERVICE_BASE_URL.',
    });
  }

  return new ApiClientError({
    code: 'FORECAST_REQUEST_SETUP_ERROR',
    message: error.message || 'Không thể chuẩn bị yêu cầu dự báo.',
  });
}

export const forecastApi = {
  async getForecast({ sku, horizonDays }) {
    try {
      const response = await aiServiceClient.post('/forecast', { sku, horizonDays });
      return validateForecastResponse(response.data, { sku, horizonDays });
    } catch (error) {
      throw normalizeRequestError(error);
    }
  },
};
