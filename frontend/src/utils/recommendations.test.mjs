import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatRecommendationNumber,
  getRecommendationId,
  getRiskLevel,
} from './recommendations.js';

test('getRiskLevel reads AI service risk fields and maps critical risk to high', () => {
  assert.equal(getRiskLevel({ shortage_risk: 'LOW' }), 'LOW');
  assert.equal(getRiskLevel({ shortageRisk: 'medium' }), 'MEDIUM');
  assert.equal(getRiskLevel({ shortage_risk: 'CRITICAL' }), 'HIGH');
});

test('getRiskLevel uses urgency when shortage risk is absent', () => {
  assert.equal(getRiskLevel({ urgency_level: 'HIGH' }), 'HIGH');
  assert.equal(getRiskLevel({ urgencyLevel: 'MEDIUM' }), 'MEDIUM');
  assert.equal(getRiskLevel({}), 'UNKNOWN');
});

test('getRecommendationId supports persisted and product/warehouse identifiers', () => {
  assert.equal(getRecommendationId({ id: 21 }), '21');
  assert.equal(getRecommendationId({ product_id: 4, warehouse_id: 8 }), '4:8');
  assert.equal(getRecommendationId({ product_id: 4 }), null);
});

test('formatRecommendationNumber returns a dash for non-numeric values', () => {
  assert.equal(formatRecommendationNumber(1234.56), '1.234,6');
  assert.equal(formatRecommendationNumber('unknown'), '—');
});
