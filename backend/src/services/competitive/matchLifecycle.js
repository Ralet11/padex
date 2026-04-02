const { Op } = require('sequelize');
const { MATCH_STATES } = require('../../constants/matchStates');
const { SLOT_STATES } = require('../../constants/slotStates');

const ACTIVE_MATCH_STATES = Object.freeze([
  MATCH_STATES.OPEN,
  MATCH_STATES.RESERVED,
  MATCH_STATES.IN_PROGRESS,
]);

const MATCH_STATE_TRANSITIONS = Object.freeze({
  [MATCH_STATES.DRAFT]: [MATCH_STATES.OPEN, MATCH_STATES.CANCELLED],
  [MATCH_STATES.OPEN]: [MATCH_STATES.RESERVED, MATCH_STATES.CANCELLED],
  [MATCH_STATES.RESERVED]: [MATCH_STATES.OPEN, MATCH_STATES.IN_PROGRESS, MATCH_STATES.COMPLETED, MATCH_STATES.CANCELLED],
  [MATCH_STATES.IN_PROGRESS]: [MATCH_STATES.COMPLETED, MATCH_STATES.CANCELLED],
  [MATCH_STATES.COMPLETED]: [],
  [MATCH_STATES.CANCELLED]: [],
});

const SLOT_STATE_TRANSITIONS = Object.freeze({
  [SLOT_STATES.AVAILABLE]: [SLOT_STATES.HELD, SLOT_STATES.RESERVED, SLOT_STATES.BLOCKED],
  [SLOT_STATES.HELD]: [SLOT_STATES.AVAILABLE, SLOT_STATES.RESERVED, SLOT_STATES.BLOCKED],
  [SLOT_STATES.RESERVED]: [SLOT_STATES.RELEASED, SLOT_STATES.OCCUPIED, SLOT_STATES.COMPLETED, SLOT_STATES.BLOCKED],
  [SLOT_STATES.OCCUPIED]: [SLOT_STATES.COMPLETED, SLOT_STATES.RELEASED],
  [SLOT_STATES.COMPLETED]: [],
  [SLOT_STATES.RELEASED]: [SLOT_STATES.AVAILABLE, SLOT_STATES.RESERVED, SLOT_STATES.BLOCKED],
  [SLOT_STATES.BLOCKED]: [SLOT_STATES.AVAILABLE, SLOT_STATES.RESERVED],
});

function buildInvalidTransitionError(entity, fromState, toState) {
  const error = new Error(`Transicion invalida de ${entity}: ${fromState || 'unknown'} -> ${toState}`);
  error.code = 'INVALID_LIFECYCLE_TRANSITION';
  error.entity = entity;
  error.from_state = fromState || null;
  error.to_state = toState || null;
  return error;
}

function assertLifecycleTransition(entity, currentState, nextState, allowedTransitions) {
  if (currentState === nextState) return;

  const allowed = allowedTransitions[currentState] || [];
  if (!allowed.includes(nextState)) {
    throw buildInvalidTransitionError(entity, currentState, nextState);
  }
}

function assertMatchLifecycleTransition(match, nextState) {
  assertLifecycleTransition('match', match?.state, nextState, MATCH_STATE_TRANSITIONS);
}

function assertSlotLifecycleTransition(slot, nextState) {
  assertLifecycleTransition('slot', slot?.state, nextState, SLOT_STATE_TRANSITIONS);
}

function assertCompetitiveCompletionLifecycle(match, slot) {
  assertMatchLifecycleTransition(match, MATCH_STATES.COMPLETED);

  if (slot && !slot.booked_externally) {
    assertSlotLifecycleTransition(slot, SLOT_STATES.COMPLETED);
  }
}

function buildActiveMatchWhere(extraWhere = {}) {
  return {
    ...extraWhere,
    [Op.or]: [
      { state: { [Op.in]: ACTIVE_MATCH_STATES } },
      { status: { [Op.in]: ['open', 'reserved'] } },
    ],
  };
}

async function updateMatchLifecycle(match, state, options = {}) {
  assertMatchLifecycleTransition(match, state);
  await match.update({ state }, options);
}

async function updateSlotLifecycle(slot, state, options = {}) {
  assertSlotLifecycleTransition(slot, state);
  await slot.update({ state }, options);
}

async function releaseSlotIfManagedByApp(slot, options = {}) {
  if (!slot || slot.booked_externally) return false;

  await updateSlotLifecycle(slot, SLOT_STATES.RELEASED, options);
  return true;
}

function canAssignCompetitiveSeason(slot) {
  return Boolean(slot) && !slot.booked_externally;
}

module.exports = {
  ACTIVE_MATCH_STATES,
  MATCH_STATE_TRANSITIONS,
  SLOT_STATE_TRANSITIONS,
  buildActiveMatchWhere,
  assertMatchLifecycleTransition,
  assertSlotLifecycleTransition,
  assertCompetitiveCompletionLifecycle,
  updateMatchLifecycle,
  updateSlotLifecycle,
  releaseSlotIfManagedByApp,
  canAssignCompetitiveSeason,
};
