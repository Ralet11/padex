const { categoryFromStars } = require('../elo');

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pickFirstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function deriveLegacyProjection(source = {}) {
  const progressionPoints = normalizeNumber(pickFirstDefined(source.progression_points, source.stars), null);
  const rating = normalizeNumber(pickFirstDefined(source.competitive_rating, source.rating), null);
  const stars = progressionPoints !== null
    ? Math.max(0, progressionPoints)
    : Math.max(0, normalizeNumber(source.stars, 0));

  return {
    stars,
    category_tier: pickFirstDefined(source.competitive_tier, source.tier, source.category_tier) || categoryFromStars(stars),
    rating: rating !== null ? rating : null,
    progression_points: progressionPoints !== null ? progressionPoints : stars
  };
}

function buildCompetitiveContext(source = {}) {
  return {
    league_id: source.league_id || null,
    season_id: source.season_id || null,
    category: pickFirstDefined(source.competitive_category, source.category) || null,
    tier: pickFirstDefined(source.competitive_tier, source.tier, source.category_tier) || null,
    rating: normalizeNumber(pickFirstDefined(source.competitive_rating, source.rating), null),
    ranking: normalizeNumber(pickFirstDefined(source.competitive_ranking, source.ranking, source.position), null),
    progression_points: normalizeNumber(pickFirstDefined(source.progression_points, source.stars), null)
  };
}

function buildReputationSummary(source = {}) {
  return {
    avg_score: normalizeNumber(pickFirstDefined(source.reputation_avg_score, source.avg_score), 0),
    ratings_count: normalizeNumber(pickFirstDefined(source.reputation_ratings_count, source.ratings_count, source.total_ratings, source.total), 0)
  };
}

function attachLegacyCompatibility(payload = {}, source = {}) {
  const legacy = deriveLegacyProjection(source);

  return {
    ...payload,
    competitive_context: buildCompetitiveContext(source),
    reputation_summary: buildReputationSummary(source),
    stars: legacy.stars,
    category_tier: legacy.category_tier
  };
}

module.exports = {
  deriveLegacyProjection,
  buildCompetitiveContext,
  buildReputationSummary,
  attachLegacyCompatibility
};
