import { ApiClientError } from './ApiClientError';
import { httpClient } from './httpClient';
import { normalizeForecastResponse, normalizeModelInfo } from '../utils/forecast';

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
  /** Gọi backend để tạo dự báo; backend tích hợp với AI service nội bộ. */
  async getForecast({ productId, horizonDays, warehouseId = null, signal } = {}) {
    try {
      const payload = { productId, horizonDays };
      if (warehouseId) payload.warehouseId = warehouseId;
      const response = await httpClient.post('/forecast/demand', payload, {
        signal,
        timeout: 40000,
      });
      return normalizeForecastResponse(unwrapEnvelope(response), { productId, horizonDays });
    } catch (error) {
      if (signal?.aborted) {
        throw new ApiClientError({ code: 'REQUEST_CANCELLED', message: 'Yêu cầu đã bị huỷ.' });
      }
      throw error;
    }
  },

  /** Lấy metadata và độ đo của mô hình AI qua backend. */
  async getModelInfo({ signal } = {}) {
    const response = await httpClient.get('/forecast/models', { signal });
    return normalizeModelInfo(unwrapEnvelope(response));
  },
};
