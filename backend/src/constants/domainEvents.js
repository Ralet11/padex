const COMPETITIVE_EVENT_TYPES = Object.freeze({
  RESULT_RECORDED: 'result_recorded',
  STANDING_UPDATED: 'standing_updated',
  SEASON_SEEDED: 'season_seeded',
  PROGRESSION_PROJECTED: 'progression_projected'
});

const REPUTATION_EVENT_TYPES = Object.freeze({
  PROFILE_UPDATED: 'reputation_profile_updated',
  RATING_SUBMITTED: 'reputation_rating_submitted'
});

const RESULT_OUTCOMES = Object.freeze({
  WIN: 'win',
  LOSS: 'loss',
  DRAW: 'draw'
});

const RESULT_SIDES = Object.freeze({
  A: 'A',
  B: 'B'
});

module.exports = {
  COMPETITIVE_EVENT_TYPES,
  REPUTATION_EVENT_TYPES,
  RESULT_OUTCOMES,
  RESULT_SIDES
};
