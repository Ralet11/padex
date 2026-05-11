const { MATCH_PAYMENT_CONFIG } = require('../constants/matchPayments');

function normalizeMaxPlayers(value) {
  const normalized = Number(value || 4);
  if (!Number.isInteger(normalized) || normalized <= 0) return 4;
  return normalized;
}

function getBasePlayerAmount(totalCourtPrice, maxPlayers = 4) {
  const totalAmount = Number(totalCourtPrice || 0);
  return Math.round(totalAmount / normalizeMaxPlayers(maxPlayers));
}

function getPositionExtraAmount(positionIndex, extras = MATCH_PAYMENT_CONFIG.position_extras) {
  const normalizedIndex = Number(positionIndex || 0);
  if (!Number.isInteger(normalizedIndex) || normalizedIndex <= 0) return 0;
  return Number(extras[normalizedIndex - 1] || 0);
}

function getPlayerPaymentQuote({ totalCourtPrice, maxPlayers = 4, positionIndex = 0 }) {
  const baseAmount = getBasePlayerAmount(totalCourtPrice, maxPlayers);
  const extraAmount = getPositionExtraAmount(positionIndex);

  return {
    position_index: Number(positionIndex || 0),
    base_amount: baseAmount,
    extra_amount: extraAmount,
    total_amount: baseAmount + extraAmount,
    currency: MATCH_PAYMENT_CONFIG.currency,
  };
}

function buildMatchPricingSnapshot({ totalCourtPrice, maxPlayers = 4, currentPlayers = 0 }) {
  const normalizedMaxPlayers = normalizeMaxPlayers(maxPlayers);
  const positions = Array.from({ length: normalizedMaxPlayers }, (_, positionIndex) => getPlayerPaymentQuote({
    totalCourtPrice,
    maxPlayers: normalizedMaxPlayers,
    positionIndex,
  }));

  const nextPositionIndex = Math.min(Math.max(Number(currentPlayers || 0), 0), Math.max(normalizedMaxPlayers - 1, 0));
  const nextPlayerQuote = positions[nextPositionIndex] || null;

  return {
    base_per_player: getBasePlayerAmount(totalCourtPrice, normalizedMaxPlayers),
    position_extras: [...MATCH_PAYMENT_CONFIG.position_extras],
    positions,
    next_position_index: nextPositionIndex,
    next_player_quote: nextPlayerQuote,
    currency: MATCH_PAYMENT_CONFIG.currency,
  };
}

module.exports = {
  normalizeMaxPlayers,
  getBasePlayerAmount,
  getPositionExtraAmount,
  getPlayerPaymentQuote,
  buildMatchPricingSnapshot,
};
