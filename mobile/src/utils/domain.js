export const MATCH_STATES = Object.freeze({
  DRAFT: 'draft',
  OPEN: 'open',
  RESERVED: 'reserved',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

export const SLOT_STATES = Object.freeze({
  AVAILABLE: 'available',
  HELD: 'held',
  RESERVED: 'reserved',
  OCCUPIED: 'occupied',
  COMPLETED: 'completed',
  RELEASED: 'released',
  BLOCKED: 'blocked',
});

export function getMatchState(match) {
  return match?.state || match?.status || MATCH_STATES.OPEN;
}

export function getCompetitiveTier(entity) {
  return Number(entity?.competitive_context?.tier ?? entity?.competitive_tier ?? entity?.category_tier ?? 7);
}

export function getProgressionPoints(entity) {
  return Number(entity?.competitive_context?.progression_points ?? entity?.progression_points ?? entity?.stars ?? 0);
}

export function getCompetitiveRating(entity) {
  return Number(entity?.competitive_context?.rating ?? entity?.competitive_rating ?? entity?.elo ?? entity?.stars ?? 0);
}

export function getReputationScore(entity) {
  return Number(entity?.reputation_summary?.avg_score ?? entity?.reputation_avg_score ?? entity?.avg_rating ?? 0);
}

export function getReputationRatingsCount(entity) {
  return Number(entity?.reputation_summary?.ratings_count ?? entity?.reputation_ratings_count ?? entity?.total_ratings ?? 0);
}

export function getCompetitiveWins(entity) {
  return Number(entity?.competitive_context?.wins ?? entity?.wins ?? 0);
}

export function getCompetitiveLosses(entity) {
  return Number(entity?.competitive_context?.losses ?? entity?.losses ?? 0);
}

export function getSlotState(slot) {
  if (slot?.state) return slot.state;
  if (slot?.booked_externally || slot?.occupant_name || slot?.occupant_phone) return SLOT_STATES.BLOCKED;
  return slot?.is_available === false ? SLOT_STATES.RESERVED : SLOT_STATES.AVAILABLE;
}

export function isAvailableSlot(slot) {
  const slotState = getSlotState(slot);
  return slotState === SLOT_STATES.AVAILABLE || slotState === SLOT_STATES.RELEASED;
}
