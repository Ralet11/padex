const { RESULT_OUTCOMES, RESULT_SIDES } = require('../constants/domainEvents');

const CANONICAL_RESULT_SCHEMA_VERSION = 1;

function createCompetitiveResultContract(result = {}) {
  return {
    schema_version: CANONICAL_RESULT_SCHEMA_VERSION,
    winning_side: result.winning_side || null,
    score: Array.isArray(result.score) ? result.score : [],
    recorded_by: result.recorded_by || null,
    source: result.source || 'backend'
  };
}

function isCanonicalCompetitiveResult(result) {
  if (!result || typeof result !== 'object') {
    return false;
  }

  if (!Object.values(RESULT_SIDES).includes(result.winning_side)) {
    return false;
  }

  if (!Array.isArray(result.score) || result.score.length === 0) {
    return false;
  }

  return result.score.every((setScore) => Number.isInteger(setScore.a) && Number.isInteger(setScore.b));
}

function normalizeMatchPlayerResult(result) {
  if (Object.values(RESULT_OUTCOMES).includes(result)) {
    return result;
  }

  return null;
}

module.exports = {
  CANONICAL_RESULT_SCHEMA_VERSION,
  createCompetitiveResultContract,
  isCanonicalCompetitiveResult,
  normalizeMatchPlayerResult
};
