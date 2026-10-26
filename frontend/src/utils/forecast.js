import { ApiClientError } from '../api/ApiClientError.js';

/** Khoảng dự báo hỗ trợ trên UI (Sprint8-09: 7/14/30 ngày). */
export const FORECAST_HORIZONS = [7, 14, 30];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function invalidResponse(message) {
  return new ApiClientError({ code: 'INVALID_FORECAST_RESPONSE', message });
}

function isValidIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isNonNegativeNumber(value) {
  return Number.isFinite(value) && value >= 0;
}

function optionalBound(value) {
  if (value === null || value === undefined) return null;
  return isNonNegativeNumber(value) ? value : undefined;
}

/**
 * Chuẩn hoá `data` của POST /api/forecast/demand (snake_case) thành object camelCase
 * cho UI. Ném INVALID_FORECAST_RESPONSE nếu response không khớp yêu cầu hoặc hỏng.
 */
export function normalizeForecastResponse(data, { productId, horizonDays }) {
  if (
    !data ||
    typeof data !== 'object' ||
    data.product_id !== productId ||
    data.horizon_days !== horizonDays ||
    !Array.isArray(data.predictions)
  ) {
    throw invalidResponse('AI service trả về dữ liệu dự báo không đúng định dạng.');
  }

  if (data.predictions.length !== horizonDays) {
    throw invalidResponse(
      `Dự báo cần có ${horizonDays} ngày nhưng AI service trả về ${data.predictions.length} ngày.`
    );
  }

  const seenDates = new Set();
  const predictions = data.predictions.map((point) => {
    const lowerBound = optionalBound(point?.lower_bound);
    const upperBound = optionalBound(point?.upper_bound);

    if (
      !isValidIsoDate(point?.date) ||
      seenDates.has(point.date) ||
      !isNonNegativeNumber(point.predicted_demand) ||
      lowerBound === undefined ||
      upperBound === undefined ||
      (lowerBound !== null && upperBound !== null && lowerBound > upperBound)
    ) {
      throw invalidResponse('AI service trả về một điểm dự báo không hợp lệ.');
    }

    seenDates.add(point.date);
    return {
      date: point.date,
      predictedDemand: point.predicted_demand,
      lowerBound,
      upperBound,
    };
  });

  predictions.sort((a, b) => a.date.localeCompare(b.date));

  return {
    productId: data.product_id,
    warehouseId: data.warehouse_id ?? null,
    horizonDays: data.horizon_days,
    startDate: isValidIsoDate(data.forecast_start_date) ? data.forecast_start_date : predictions[0].date,
    endDate: isValidIsoDate(data.forecast_end_date)
      ? data.forecast_end_date
      : predictions[predictions.length - 1].date,
    predictions,
    modelName: typeof data.model_name === 'string' ? data.model_name : null,
    modelVersion: typeof data.model_version === 'string' ? data.model_version : null,
    fallbackApplied: data.fallback_applied === true,
  };
}

/** Tổng, trung bình, ngày cao/thấp nhất — tính lại từ predictions để không phụ thuộc làm tròn của server. */
export function summarizeForecast(forecast) {
  const points = forecast?.predictions ?? [];
  if (points.length === 0) return null;

  let peak = points[0];
  let low = points[0];
  let total = 0;
  for (const point of points) {
    total += point.predictedDemand;
    if (point.predictedDemand > peak.predictedDemand) peak = point;
    if (point.predictedDemand < low.predictedDemand) low = point;
  }

  return { total, dailyAverage: total / points.length, peak, low, days: points.length };
}

/**
 * Chuẩn hoá `data` của GET /api/forecast/models. Metric thiếu/không hợp lệ thành null
 * để UI hiển thị "Chưa có" thay vì số sai.
 */
export function normalizeModelInfo(data) {
  if (!data || typeof data !== 'object' || typeof data.is_loaded !== 'boolean') {
    throw new ApiClientError({
      code: 'INVALID_MODEL_INFO_RESPONSE',
      message: 'AI service trả về thông tin mô hình không đúng định dạng.',
    });
  }

  const metrics = data.metrics && typeof data.metrics === 'object' ? data.metrics : {};
  const metric = (key) => (Number.isFinite(metrics[key]) ? metrics[key] : null);
  const nonNegativeMetric = (key) => {
    const value = metric(key);
    return value !== null && value >= 0 ? value : null;
  };

  return {
    modelName: data.model_name ?? null,
    isLoaded: data.is_loaded,
    version: data.version ?? null,
    trainedAt: typeof data.trained_at === 'string' && !Number.isNaN(Date.parse(data.trained_at))
      ? data.trained_at
      : null,
    algorithm: data.algorithm ?? null,
    featureCount: Array.isArray(data.features) ? data.features.length : 0,
    metrics: {
      mape: nonNegativeMetric('mape'),
      mae: nonNegativeMetric('mae'),
      rmse: nonNegativeMetric('rmse'),
      r2: metric('r2'),
    },
  };
}

/**
 * Xếp loại MAPE theo thang Lewis (1982): <10% rất tốt, 10–20% tốt, 20–50% chấp nhận được, >50% kém.
 */
export function rateMape(mape) {
  if (!Number.isFinite(mape) || mape < 0) {
    return { level: 'unknown', label: 'Chưa có dữ liệu', tone: 'slate' };
  }
  if (mape < 10) return { level: 'excellent', label: 'Rất chính xác', tone: 'green' };
  if (mape < 20) return { level: 'good', label: 'Chính xác tốt', tone: 'blue' };
  if (mape < 50) return { level: 'fair', label: 'Chấp nhận được', tone: 'amber' };
  return { level: 'poor', label: 'Độ chính xác thấp', tone: 'red' };
}

/** Thanh độ chính xác hiển thị trên UI: 100 − MAPE, kẹp trong [0, 100]. */
export function accuracyPercent(mape) {
  if (!Number.isFinite(mape) || mape < 0) return null;
  return Math.max(0, Math.min(100, 100 - mape));
}

/**
 * Chuyển lỗi bất kỳ thành nội dung hiển thị (Sprint8-12): tiêu đề, mô tả, gợi ý và
 * có nên cho phép "Thử lại" hay không.
 */
export function describeForecastError(error) {
  const code = error?.code;
  const status = error?.status ?? null;
  const serverMessage = error?.message;

  if (code === 'AI_SERVICE_UNAVAILABLE') {
    return {
      kind: 'offline',
      title: 'Không kết nối được AI service',
      message: 'Dịch vụ dự báo chưa chạy hoặc không truy cập được.',
      hint: 'Chạy `python main.py` trong thư mục ai-service (cổng 8000) hoặc kiểm tra VITE_AI_SERVICE_BASE_URL.',
      retryable: true,
    };
  }
  if (code === 'AI_SERVICE_TIMEOUT') {
    return {
      kind: 'timeout',
      title: 'AI service phản hồi quá lâu',
      message: 'Yêu cầu dự báo đã hết thời gian chờ.',
      hint: 'Thử lại sau ít phút hoặc chọn khoảng dự báo ngắn hơn.',
      retryable: true,
    };
  }
  if (code === 'INVALID_FORECAST_RESPONSE' || code === 'INVALID_MODEL_INFO_RESPONSE') {
    return {
      kind: 'invalid',
      title: 'Dữ liệu trả về không hợp lệ',
      message: serverMessage || 'AI service trả về dữ liệu không đúng định dạng.',
      hint: 'Kết quả đã bị loại bỏ để tránh hiển thị số sai. Báo nhóm AI service kiểm tra contract.',
      retryable: true,
    };
  }
  if (code === 'VALIDATION_ERROR' || status === 400 || status === 422) {
    const details = Array.isArray(error?.details) && error.details.length > 0
      ? error.details.join('; ')
      : null;
    return {
      kind: 'validation',
      title: 'Yêu cầu dự báo không hợp lệ',
      message: details || serverMessage || 'Tham số gửi lên không hợp lệ.',
      hint: 'Kiểm tra lại sản phẩm và khoảng dự báo đã chọn.',
      retryable: false,
    };
  }
  if (status !== null && status >= 500) {
    return {
      kind: 'server',
      title: 'AI service gặp lỗi',
      message: serverMessage || 'Đã xảy ra lỗi khi tính dự báo.',
      hint: 'Thử lại; nếu vẫn lỗi, kiểm tra log của ai-service.',
      retryable: true,
    };
  }
  return {
    kind: 'unknown',
    title: 'Không thể tạo dự báo',
    message: serverMessage || 'Đã xảy ra lỗi không xác định.',
    hint: null,
    retryable: true,
  };
}
