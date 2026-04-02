const MATCH_STATES = Object.freeze({
  DRAFT: 'draft',
  OPEN: 'open',
  RESERVED: 'reserved',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
});

const MATCH_STATE_VALUES = Object.freeze(Object.values(MATCH_STATES));

function deriveMatchState({ state, status }) {
  if (state && MATCH_STATE_VALUES.includes(state)) {
    return state;
  }

  switch (status) {
    case 'full':
    case 'reserved':
      return MATCH_STATES.RESERVED;
    case 'completed':
      return MATCH_STATES.COMPLETED;
    case 'cancelled':
      return MATCH_STATES.CANCELLED;
    case 'draft':
      return MATCH_STATES.DRAFT;
    default:
      return MATCH_STATES.OPEN;
  }
}

function deriveLegacyStatus({ state, status }) {
  if (status) {
    return status;
  }

  switch (state) {
    case MATCH_STATES.DRAFT:
      return 'open';
    case MATCH_STATES.RESERVED:
    case MATCH_STATES.IN_PROGRESS:
      return 'reserved';
    case MATCH_STATES.COMPLETED:
      return 'completed';
    case MATCH_STATES.CANCELLED:
      return 'cancelled';
    case MATCH_STATES.OPEN:
    default:
      return 'open';
  }
}

module.exports = {
  MATCH_STATES,
  MATCH_STATE_VALUES,
  deriveMatchState,
  deriveLegacyStatus
};
