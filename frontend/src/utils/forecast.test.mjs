import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FORECAST_HORIZONS,
  normalizeForecastResponse,
  summarizeForecast,
  normalizeModelInfo,
  rateMape,
  accuracyPercent,
  describeForecastError,
} from './forecast.js';

function makeResponse(predictions, overrides = {}) {
  return {
    product_id: 1,
    horizon_days: predictions.length,
    forecast_start_date: predictions[0]?.date || '2026-10-26',
    forecast_end_date: predictions[predictions.length - 1]?.date || '2026-10-27',
    predictions,
    total_predicted_demand: 22.0,
    daily_average: 11.0,
    model_name: 'random_forest',
    model_version: '1.0.0',
    fallback_applied: false,
    ...overrides,
  };
}

test('FORECAST_HORIZONS supports exactly 7, 14, 30 days', () => {
  assert.deepEqual(FORECAST_HORIZONS, [7, 14, 30]);
});

test('normalizeForecastResponse: validates and sorts predictions by date', () => {
  const result = normalizeForecastResponse(
    makeResponse([
      { date: '2026-10-27', predicted_demand: 12, lower_bound: 9, upper_bound: 15 },
      { date: '2026-10-26', predicted_demand: 10, lower_bound: 7, upper_bound: 13 },
    ]),
    { productId: 1, horizonDays: 2 }
  );

  assert.equal(result.productId, 1);
  assert.equal(result.horizonDays, 2);
  assert.deepEqual(
    result.predictions.map((p) => p.date),
    ['2026-10-26', '2026-10-27']
  );
  assert.equal(result.predictions[0].predictedDemand, 10);
});

test('normalizeForecastResponse: rejects mismatch productId or horizonDays', () => {
  const payload = makeResponse([
    { date: '2026-10-26', predicted_demand: 10, lower_bound: null, upper_bound: null },
  ]);

  assert.throws(
    () => normalizeForecastResponse(payload, { productId: 2, horizonDays: 1 }),
    { code: 'INVALID_FORECAST_RESPONSE' }
  );
  assert.throws(
    () => normalizeForecastResponse(payload, { productId: 1, horizonDays: 7 }),
    { code: 'INVALID_FORECAST_RESPONSE' }
  );
});

test('normalizeForecastResponse: rejects negative demand or inverted bounds', () => {
  const invalidDemand = [
    { date: '2026-10-26', predicted_demand: -5, lower_bound: 0, upper_bound: 10 },
  ];
  assert.throws(
    () => normalizeForecastResponse(makeResponse(invalidDemand), { productId: 1, horizonDays: 1 }),
    /không hợp lệ/
  );

  const invertedBounds = [
    { date: '2026-10-26', predicted_demand: 10, lower_bound: 15, upper_bound: 5 },
  ];
  assert.throws(
    () => normalizeForecastResponse(makeResponse(invertedBounds), { productId: 1, horizonDays: 1 }),
    /không hợp lệ/
  );
});

test('summarizeForecast: calculates total, average, peak, and low point', () => {
  const forecast = {
    predictions: [
      { date: '2026-10-26', predictedDemand: 10 },
      { date: '2026-10-27', predictedDemand: 25 },
      { date: '2026-10-28', predictedDemand: 15 },
    ],
  };

  const summary = summarizeForecast(forecast);
  assert.equal(summary.total, 50);
  assert.equal(summary.dailyAverage, 50 / 3);
  assert.equal(summary.peak.date, '2026-10-27');
  assert.equal(summary.low.date, '2026-10-26');
  assert.equal(summary.days, 3);
});

test('normalizeModelInfo: normalizes metrics and flags missing values gracefully', () => {
  const rawData = {
    model_name: 'rf_model.joblib',
    is_loaded: true,
    version: '1.2.0',
    trained_at: '2026-10-25T12:00:00Z',
    algorithm: 'random_forest',
    features: ['lag_1', 'rolling_mean_7'],
    metrics: {
      mape: 12.45,
      mae: 3.21,
      rmse: 4.88,
      r2: 0.89,
    },
  };

  const info = normalizeModelInfo(rawData);
  assert.equal(info.isLoaded, true);
  assert.equal(info.version, '1.2.0');
  assert.equal(info.featureCount, 2);
  assert.equal(info.metrics.mape, 12.45);
  assert.equal(info.metrics.mae, 3.21);
  assert.equal(info.metrics.r2, 0.89);

  const emptyMetrics = normalizeModelInfo({ is_loaded: false });
  assert.equal(emptyMetrics.isLoaded, false);
  assert.equal(emptyMetrics.metrics.mape, null);
});

test('rateMape & accuracyPercent: evaluates according to Lewis scale', () => {
  assert.equal(rateMape(8.5).level, 'excellent');
  assert.equal(rateMape(14.2).level, 'good');
  assert.equal(rateMape(35.0).level, 'fair');
  assert.equal(rateMape(65.0).level, 'poor');
  assert.equal(rateMape(null).level, 'unknown');

  assert.equal(accuracyPercent(12.5), 87.5);
  assert.equal(accuracyPercent(120), 0);
  assert.equal(accuracyPercent(null), null);
});

test('describeForecastError: categorizes AI service errors correctly', () => {
  const offlineErr = describeForecastError({ code: 'AI_SERVICE_UNAVAILABLE' });
  assert.equal(offlineErr.kind, 'offline');
  assert.equal(offlineErr.retryable, true);

  const timeoutErr = describeForecastError({ code: 'AI_SERVICE_TIMEOUT' });
  assert.equal(timeoutErr.kind, 'timeout');
  assert.equal(timeoutErr.retryable, true);

  const validationErr = describeForecastError({
    code: 'VALIDATION_ERROR',
    status: 400,
    details: ['product_id: required'],
  });
  assert.equal(validationErr.kind, 'validation');
  assert.equal(validationErr.retryable, false);

  const serverErr = describeForecastError({ status: 500, message: 'Server crashed' });
  assert.equal(serverErr.kind, 'server');
  assert.equal(serverErr.retryable, true);
});
