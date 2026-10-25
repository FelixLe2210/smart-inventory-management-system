import { ApiClientError } from '../api/ApiClientError.js';

export function validateForecastResponse(data, { sku, horizonDays }) {
  const invalidResponse = (message) =>
    new ApiClientError({
      code: 'INVALID_FORECAST_RESPONSE',
      message,
    });

  if (
    !data ||
    typeof data !== 'object' ||
    data.sku !== sku ||
    data.horizonDays !== horizonDays ||
    !Array.isArray(data.predictions) ||
    (data.generatedAt != null &&
      (typeof data.generatedAt !== 'string' || Number.isNaN(Date.parse(data.generatedAt))))
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
    const parsedDate = new Date(`${point?.date}T00:00:00Z`);
    const validDate =
      typeof point?.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(point.date) &&
      !Number.isNaN(parsedDate.getTime()) &&
      parsedDate.toISOString().slice(0, 10) === point.date;
    const hasOptionalBounds =
      (point?.lowerBound === null || Number.isFinite(point?.lowerBound)) &&
      (point?.upperBound === null || Number.isFinite(point?.upperBound));

    if (
      !validDate ||
      seenDates.has(point.date) ||
      !Number.isFinite(point.predictedDemand) ||
      point.predictedDemand < 0 ||
      !hasOptionalBounds ||
      (point.lowerBound !== null && point.lowerBound < 0) ||
      (point.upperBound !== null && point.upperBound < 0) ||
      (point.lowerBound !== null &&
        point.upperBound !== null &&
        point.lowerBound > point.upperBound)
    ) {
      throw invalidResponse('AI service trả về một điểm dự báo không hợp lệ.');
    }

    seenDates.add(point.date);
    return {
      date: point.date,
      predictedDemand: point.predictedDemand,
      lowerBound: point.lowerBound ?? null,
      upperBound: point.upperBound ?? null,
    };
  });

  return {
    sku: data.sku,
    horizonDays: data.horizonDays,
    generatedAt: data.generatedAt ?? null,
    predictions: predictions.sort((a, b) => a.date.localeCompare(b.date)),
  };
}
