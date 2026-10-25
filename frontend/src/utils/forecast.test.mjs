import test from 'node:test';
import assert from 'node:assert/strict';
import { validateForecastResponse } from './forecast.js';

function makeResponse(predictions, overrides = {}) {
  return {
    sku: 'SKU-01',
    horizonDays: predictions.length,
    generatedAt: '2026-10-25T00:00:00Z',
    predictions,
    ...overrides,
  };
}

test('validates and sorts forecast predictions by date', () => {
  const result = validateForecastResponse(
    makeResponse([
      { date: '2026-10-27', predictedDemand: 12, lowerBound: 9, upperBound: 15 },
      { date: '2026-10-26', predictedDemand: 10, lowerBound: 7, upperBound: 13 },
    ]),
    { sku: 'SKU-01', horizonDays: 2 }
  );

  assert.deepEqual(
    result.predictions.map(({ date }) => date),
    ['2026-10-26', '2026-10-27']
  );
});

test('rejects a response for a different SKU or horizon', () => {
  const response = makeResponse([
    { date: '2026-10-26', predictedDemand: 10, lowerBound: null, upperBound: null },
  ]);

  assert.throws(
    () => validateForecastResponse(response, { sku: 'SKU-02', horizonDays: 1 }),
    { code: 'INVALID_FORECAST_RESPONSE' }
  );
});

test('rejects missing days and invalid forecast values', () => {
  const oneDay = [{ date: '2026-10-26', predictedDemand: -1, lowerBound: null, upperBound: null }];

  assert.throws(
    () =>
      validateForecastResponse(makeResponse(oneDay, { horizonDays: 2 }), {
        sku: 'SKU-01',
        horizonDays: 2,
      }),
    /cần có 2 ngày/
  );
  assert.throws(
    () => validateForecastResponse(makeResponse(oneDay), { sku: 'SKU-01', horizonDays: 1 }),
    /điểm dự báo không hợp lệ/
  );
});
