const { Op } = require('sequelize');
const { Season, CompetitiveStanding } = require('../../models');

const SEASON_RESET_MODEL = 'seasonal_progression_reset';

function normalizeNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

async function getActiveSeasonForLeague(leagueId, options = {}) {
  if (!leagueId) return null;

  return Season.findOne({
    where: {
      league_id: leagueId,
      status: { [Op.in]: ['active', 'pending'] },
    },
    order: [
      ['status', 'ASC'],
      ['starts_at', 'ASC'],
      ['id', 'ASC'],
    ],
    transaction: options.transaction,
  });
}

async function ensureStandingForSeason(user, season, options = {}) {
  if (!user || !season) return { standing: null, reset_applied: false };

  const isSameSeason = Boolean(user.season_id) && user.season_id === season.id;
  const defaultProgressionPoints = isSameSeason
    ? Math.max(0, normalizeNumber(user.progression_points, user.stars || 0))
    : 0;
  const defaultRating = isSameSeason
    ? normalizeNumber(user.competitive_rating, defaultProgressionPoints)
    : 0;
  const defaultWins = isSameSeason ? Math.max(0, normalizeNumber(user.wins, 0)) : 0;
  const defaultLosses = isSameSeason ? Math.max(0, normalizeNumber(user.losses, 0)) : 0;

  const [standing, created] = await CompetitiveStanding.findOrCreate({
    where: {
      user_id: user.id,
      season_id: season.id,
    },
    defaults: {
      user_id: user.id,
      league_id: season.league_id || user.league_id || null,
      season_id: season.id,
      category: user.competitive_category || user.category || null,
      tier: user.competitive_tier || user.category_tier || null,
      rating: defaultRating,
      ranking: null,
      progression_points: defaultProgressionPoints,
      wins: defaultWins,
      losses: defaultLosses,
      legacy_stars: Math.max(0, normalizeNumber(user.stars, defaultProgressionPoints)),
      legacy_category_tier: user.category_tier || null,
    },
    transaction: options.transaction,
  });

  const resetApplied = created && user.season_id !== season.id;
  const hydratedFromUserSnapshot = created && isSameSeason;

  return {
    standing,
    reset_applied: resetApplied,
    hydrated_from_user_snapshot: hydratedFromUserSnapshot,
    previous_season_id: user.season_id || null,
  };
}

function buildSeasonResetContext(season, resetApplied = false, metadata = {}) {
  return {
    model: SEASON_RESET_MODEL,
    reset_applied: Boolean(resetApplied),
    standing_source: metadata.hydrated_from_user_snapshot
      ? 'user_snapshot'
      : (resetApplied ? 'season_reset' : 'existing_standing'),
    previous_season_id: metadata.previous_season_id || null,
    season: season
      ? {
          id: season.id,
          key: season.key,
          name: season.name,
          status: season.status,
        }
      : null,
  };
}

module.exports = {
  SEASON_RESET_MODEL,
  getActiveSeasonForLeague,
  ensureStandingForSeason,
  buildSeasonResetContext,
};
