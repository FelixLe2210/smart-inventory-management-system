export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];

export function getRiskLevel(recommendation) {
  const risk = String(recommendation?.shortageRisk ?? recommendation?.shortage_risk ?? '').toUpperCase();
  if (RISK_LEVELS.includes(risk)) return risk;
  if (risk === 'CRITICAL') return 'HIGH';

  const urgency = String(recommendation?.urgencyLevel ?? recommendation?.urgency_level ?? '').toUpperCase();
  if (urgency === 'CRITICAL' || urgency === 'HIGH') return 'HIGH';
  if (urgency === 'MEDIUM') return 'MEDIUM';
  if (urgency === 'LOW') return 'LOW';
  return 'UNKNOWN';
}

export function getRecommendationId(recommendation) {
  if (recommendation?.id !== undefined && recommendation?.id !== null) {
    return String(recommendation.id);
  }
  const productId = recommendation?.productId ?? recommendation?.product_id;
  const warehouseId = recommendation?.warehouseId ?? recommendation?.warehouse_id;
  if (productId === undefined || warehouseId === undefined) return null;
  return `${productId}:${warehouseId}`;
}

export function formatRecommendationNumber(value, digits = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(number);
}
