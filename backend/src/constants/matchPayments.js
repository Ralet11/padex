const MATCH_PAYMENT_ROLES = Object.freeze({
  CREATOR: 'creator',
  PLAYER: 'player',
});

const MATCH_PAYMENT_ROLE_VALUES = Object.freeze(Object.values(MATCH_PAYMENT_ROLES));

const MATCH_PAYMENT_STATUSES = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  REFUND_PENDING: 'refund_pending',
  REFUNDED: 'refunded',
});

const MATCH_PAYMENT_STATUS_VALUES = Object.freeze(Object.values(MATCH_PAYMENT_STATUSES));

const MATCH_PAYMENT_PROVIDERS = Object.freeze({
  MOCK: 'mock',
  MERCADOPAGO: 'mercadopago',
});

const MATCH_PAYMENT_PROVIDER_VALUES = Object.freeze(Object.values(MATCH_PAYMENT_PROVIDERS));

const DEFAULT_POSITION_EXTRAS = Object.freeze([100, 200, 300]);

function parseIntegerList(rawValue, fallback) {
  if (typeof rawValue !== 'string' || !rawValue.trim()) return [...fallback];

  const values = rawValue
    .split(',')
    .map((value) => Number(String(value).trim()))
    .filter((value) => Number.isFinite(value) && value >= 0);

  return values.length > 0 ? values : [...fallback];
}

function normalizeProvider(rawValue) {
  const normalized = String(rawValue || MATCH_PAYMENT_PROVIDERS.MOCK).trim().toLowerCase();
  if (MATCH_PAYMENT_PROVIDER_VALUES.includes(normalized)) return normalized;
  return MATCH_PAYMENT_PROVIDERS.MOCK;
}

const MATCH_PAYMENT_CONFIG = Object.freeze({
  enabled: String(process.env.MATCH_PAYMENTS_ENABLED || '').trim().toLowerCase() === 'true',
  provider: normalizeProvider(process.env.MATCH_PAYMENTS_PROVIDER),
  currency: String(process.env.MATCH_PAYMENTS_CURRENCY || 'ARS').trim().toUpperCase(),
  position_extras: parseIntegerList(process.env.MATCH_PAYMENT_POSITION_EXTRAS, DEFAULT_POSITION_EXTRAS),
  incomplete_cancel_hours: Math.max(1, Number(process.env.MATCH_PAYMENT_INCOMPLETE_CANCEL_HOURS || 4) || 4),
  creator_intent_expires_minutes: Math.max(5, Number(process.env.MATCH_PAYMENT_CREATOR_EXPIRES_MINUTES || 15) || 15),
  join_intent_expires_minutes: Math.max(5, Number(process.env.MATCH_PAYMENT_JOIN_EXPIRES_MINUTES || 20) || 20),
  public_base_url: String(process.env.PUBLIC_BASE_URL || process.env.APP_BASE_URL || '').trim().replace(/\/+$/, ''),
  webhook_path: String(process.env.MATCH_PAYMENTS_WEBHOOK_PATH || '/api/payments/mercadopago/webhook').trim(),
  mobile_scheme: String(process.env.MOBILE_APP_SCHEME || 'padex').trim(),
  allow_mock_confirm: String(process.env.MATCH_PAYMENTS_ALLOW_MOCK || 'true').trim().toLowerCase() !== 'false',
});

module.exports = {
  MATCH_PAYMENT_ROLES,
  MATCH_PAYMENT_ROLE_VALUES,
  MATCH_PAYMENT_STATUSES,
  MATCH_PAYMENT_STATUS_VALUES,
  MATCH_PAYMENT_PROVIDERS,
  MATCH_PAYMENT_PROVIDER_VALUES,
  MATCH_PAYMENT_CONFIG,
};
