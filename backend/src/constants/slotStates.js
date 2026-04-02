const SLOT_STATES = Object.freeze({
  AVAILABLE: 'available',
  HELD: 'held',
  RESERVED: 'reserved',
  OCCUPIED: 'occupied',
  COMPLETED: 'completed',
  RELEASED: 'released',
  BLOCKED: 'blocked'
});

const SLOT_STATE_VALUES = Object.freeze(Object.values(SLOT_STATES));

function deriveSlotState({ state, is_available, booked_externally, occupant_name, occupant_phone }) {
  if (state && SLOT_STATE_VALUES.includes(state)) {
    return state;
  }

  if (booked_externally || occupant_name || occupant_phone) {
    return SLOT_STATES.BLOCKED;
  }

  return is_available === false ? SLOT_STATES.RESERVED : SLOT_STATES.AVAILABLE;
}

function isSlotAvailableState(state) {
  return [SLOT_STATES.AVAILABLE, SLOT_STATES.RELEASED].includes(deriveSlotState({ state }));
}

module.exports = {
  SLOT_STATES,
  SLOT_STATE_VALUES,
  deriveSlotState,
  isSlotAvailableState
};
