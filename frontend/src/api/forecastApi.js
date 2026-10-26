import axios from 'axios';
import { ApiClientError } from './ApiClientError';
import { normalizeForecastResponse, normalizeModelInfo } from '../utils/forecast';

const AI_SERVICE_BASE_URL =
  import.meta.env.VITE_AI_SERVICE_BASE_URL || 'http://localhost:8000';

const aiServiceClient = axios.create({
  baseURL: AI_SERVICE_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

function normalizeRequestError(error) {
  if (error instanceof ApiClientError) return error;

  if (axios.isCancel(error)) {
    return new ApiClientError({ code: 'REQUEST_CANCELLED', message: 'Yêu cầu đã bị huỷ.' });
  }

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new ApiClientError({
      code: 'AI_SERVICE_TIMEOUT',
      message: 'AI service phản hồi quá lâu.',
    });
  }

  if (error.response) {
    const body = error.response.data;
    const detail = typeof body?.detail === 'string' ? body.detail : null;
    return new ApiClientError({
      code: body?.error?.code || body?.code || 'FORECAST_REQUEST_FAILED',
      message:
        body?.error?.message ||
        detail ||
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

/** Bóc envelope `{ success, data, error }` theo docs/api/API_CONVENTIONS.md. */
function unwrapEnvelope(body) {
  if (body && typeof body === 'object' && 'success' in body) {
    if (body.success === false) {
      throw new ApiClientError({
        code: body.error?.code || 'FORECAST_REQUEST_FAILED',
        message: body.error?.message || 'AI service báo lỗi.',
        details: body.error?.details || null,
      });
    }
    return body.data;
  }
  return body;
}

export const forecastApi = {
  /** POST /api/forecast/demand — dự báo nhu cầu theo ngày cho một sản phẩm. */
  async getForecast({ productId, horizonDays, warehouseId = null, signal } = {}) {
    try {
      const payload = { product_id: productId, horizon_days: horizonDays };
      if (warehouseId) payload.warehouse_id = warehouseId;
      const response = await aiServiceClient.post('/api/forecast/demand', payload, { signal });
      return normalizeForecastResponse(unwrapEnvelope(response.data), { productId, horizonDays });
    } catch (error) {
      throw normalizeRequestError(error);
    }
  },

  /** GET /api/forecast/models — thông tin và độ đo (MAPE/MAE/RMSE/R²) của mô hình đang dùng. */
  async getModelInfo({ signal } = {}) {
    try {
      const response = await aiServiceClient.get('/api/forecast/models', { signal });
      return normalizeModelInfo(unwrapEnvelope(response.data));
    } catch (error) {
      throw normalizeRequestError(error);
    }
  },
};
