const {
  sequelize,
  League,
  Season,
  Slot,
  Match,
  MatchPlayer,
  User,
  Rating,
  ReputationProfile,
  ReputationRating,
  CompetitiveStanding,
  CompetitiveResult,
} = require('../../models');
const { deriveSlotState } = require('../../constants/slotStates');
const { deriveMatchState } = require('../../constants/matchStates');
const { RESULT_OUTCOMES, RESULT_SIDES } = require('../../constants/domainEvents');
const { categoryFromStars, nameFromTier } = require('../elo');
const { getEffectivePlayerSide } = require('./teams');

const DEFAULT_LEAGUE_KEY = 'padex-default-league';

function normalizeNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildDefaultSeasonKey(now = new Date()) {
  return `padex-foundation-${now.getUTCFullYear()}`;
}

async function ensureCanonicalFoundation(options = {}) {
  const transaction = options.transaction;
  const now = options.now || new Date();
  const seasonKey = options.seasonKey || buildDefaultSeasonKey(now);

  const [league, leagueCreated] = await League.findOrCreate({
    where: { key: DEFAULT_LEAGUE_KEY },
    defaults: {
      key: DEFAULT_LEAGUE_KEY,
      name: 'Liga General Padex',
      status: 'active',
    },
    transaction,
  });

  const [season, seasonCreated] = await Season.findOrCreate({
    where: { key: seasonKey },
    defaults: {
      league_id: league.id,
      key: seasonKey,
      name: `Temporada ${now.getUTCFullYear()} Fundacional`,
      status: 'active',
      starts_at: now,
      ends_at: null,
    },
    transaction,
  });

  if (season.league_id !== league.id || season.status !== 'active') {
    season.league_id = league.id;
    season.status = 'active';
    if (!season.starts_at) season.starts_at = now;
    await season.save({ transaction });
  }

  return {
    league,
    season,
    created: {
      league: leagueCreated,
      season: seasonCreated,
    },
  };
}

function buildCompetitiveProjection(user, fallbackLeagueId, fallbackSeasonId) {
  const progressionPoints = Math.max(0, normalizeNumber(user.progression_points, user.stars || 0));
  const rating = normalizeNumber(user.competitive_rating, progressionPoints);
  const tier = user.competitive_tier || user.category_tier || categoryFromStars(progressionPoints);

  return {
    league_id: user.league_id || fallbackLeagueId || null,
    season_id: user.season_id || fallbackSeasonId || null,
    category: user.competitive_category || user.category || nameFromTier(tier),
    tier,
    rating,
    ranking: user.competitive_ranking || null,
    progression_points: progressionPoints,
    legacy_stars: Math.max(0, normalizeNumber(user.stars, progressionPoints)),
    legacy_category_tier: user.category_tier || tier,
  };
}

async function backfillUsersAndStandings({ league, season, transaction, summary }) {
  const users = await User.findAll({ transaction });

  for (const user of users) {
    const projection = buildCompetitiveProjection(user, league?.id, season?.id);
    let userTouched = false;

    if (!user.league_id && projection.league_id) {
      user.league_id = projection.league_id;
      userTouched = true;
    }
    if (!user.season_id && projection.season_id) {
      user.season_id = projection.season_id;
      userTouched = true;
    }
    if (user.progression_points !== projection.progression_points) {
      user.progression_points = projection.progression_points;
      userTouched = true;
    }
    if (!user.competitive_tier || user.competitive_tier !== projection.tier) {
      user.competitive_tier = projection.tier;
      userTouched = true;
    }
    if (!user.competitive_category || user.competitive_category !== projection.category) {
      user.competitive_category = projection.category;
      userTouched = true;
    }
    if (user.competitive_rating == null) {
      user.competitive_rating = projection.rating;
      userTouched = true;
    }

    if (userTouched) {
      await user.save({ transaction });
      summary.users_updated += 1;
    }

    const [standing, created] = await CompetitiveStanding.findOrCreate({
      where: {
        user_id: user.id,
        season_id: projection.season_id,
      },
      defaults: {
        user_id: user.id,
        league_id: projection.league_id,
        season_id: projection.season_id,
        category: projection.category,
        tier: projection.tier,
        rating: projection.rating,
        ranking: projection.ranking,
        progression_points: projection.progression_points,
        wins: normalizeNumber(user.wins, 0),
        losses: normalizeNumber(user.losses, 0),
        legacy_stars: projection.legacy_stars,
        legacy_category_tier: projection.legacy_category_tier,
      },
      transaction,
    });

    if (created) {
      summary.standings_created += 1;
      continue;
    }

    const nextStanding = {
      league_id: projection.league_id,
      category: projection.category,
      tier: projection.tier,
      rating: projection.rating,
      ranking: projection.ranking,
      progression_points: projection.progression_points,
      wins: normalizeNumber(user.wins, 0),
      losses: normalizeNumber(user.losses, 0),
      legacy_stars: projection.legacy_stars,
      legacy_category_tier: projection.legacy_category_tier,
    };

    const changed = Object.entries(nextStanding).some(([key, value]) => standing[key] !== value);
    if (changed) {
      Object.assign(standing, nextStanding);
      await standing.save({ transaction });
      summary.standings_updated += 1;
    }
  }
}

async function backfillReputation({ transaction, summary }) {
  const legacyRatings = await Rating.findAll({ transaction, order: [['id', 'ASC']] });

  for (const legacyRating of legacyRatings) {
    const existing = await ReputationRating.findOne({
      where: {
        rater_id: legacyRating.rater_id,
        rated_id: legacyRating.rated_id,
        match_id: legacyRating.match_id,
      },
      transaction,
    });

    if (existing) continue;

    const [profile] = await ReputationProfile.findOrCreate({
      where: { user_id: legacyRating.rated_id },
      defaults: { user_id: legacyRating.rated_id },
      transaction,
    });

    await ReputationRating.create({
      profile_id: profile.id,
      rater_id: legacyRating.rater_id,
      rated_id: legacyRating.rated_id,
      match_id: legacyRating.match_id,
      score: legacyRating.score,
      comment: legacyRating.comment || null,
      submitted_at: legacyRating.createdAt || new Date(),
    }, { transaction });

    summary.reputation_ratings_backfilled += 1;
  }

  const profiles = await ReputationProfile.findAll({ transaction });
  for (const profile of profiles) {
    const ratings = await ReputationRating.findAll({
      where: { rated_id: profile.user_id },
      attributes: ['score', 'submitted_at'],
      order: [['submitted_at', 'DESC']],
      transaction,
    });

    const count = ratings.length;
    const avgScore = count
      ? Math.round((ratings.reduce((acc, rating) => acc + Number(rating.score || 0), 0) / count) * 10) / 10
      : 0;
    const lastRatedAt = count ? ratings[0].submitted_at || ratings[0].createdAt || new Date() : null;
    const changed = profile.avg_score !== avgScore
      || profile.ratings_count !== count
      || String(profile.last_rated_at || '') !== String(lastRatedAt || '');

    if (changed) {
      profile.avg_score = avgScore;
      profile.ratings_count = count;
      profile.last_rated_at = lastRatedAt;
      await profile.save({ transaction });
      summary.reputation_profiles_updated += 1;
    }

    await User.update({
      reputation_avg_score: avgScore,
      reputation_ratings_count: count,
    }, {
      where: { id: profile.user_id },
      transaction,
    });
  }
}

function inferWinningSideFromPlayers(players = []) {
  const winners = players.filter((player) => {
    const result = player.competitive_result || player.result;
    return result === RESULT_OUTCOMES.WIN;
  });

  const teams = [...new Set(winners.map((player) => getEffectivePlayerSide(player, { players })).filter(Boolean))];
  if (teams.length !== 1) return null;
  if (!Object.values(RESULT_SIDES).includes(teams[0])) return null;
  return teams[0];
}

function isManualPartnerReservationSlot(slot) {
  return Boolean(slot?.booked_externally || slot?.occupant_name || slot?.occupant_phone);
}

async function backfillSlotsAndMatches({ season, transaction, summary }) {
  const slots = await Slot.findAll({ transaction });
  for (const slot of slots) {
    const nextState = deriveSlotState({
      state: slot.state,
      is_available: slot.is_available,
      booked_externally: slot.booked_externally,
      occupant_name: slot.occupant_name,
      occupant_phone: slot.occupant_phone,
    });

    if (slot.state !== nextState) {
      slot.state = nextState;
      await slot.save({ transaction });
      summary.slots_updated += 1;
    }
  }

  const matches = await Match.findAll({
    include: [{ model: MatchPlayer, as: 'Players' }, { model: Slot }],
    transaction,
  });

  for (const match of matches) {
    const nextState = deriveMatchState({ state: match.state, status: match.status });
    const skipCompetitiveHistory = isManualPartnerReservationSlot(match.Slot);
    let touched = false;

    if (match.state !== nextState) {
      match.state = nextState;
      touched = true;
    }
    if (!skipCompetitiveHistory && !match.competitive_season_id && season?.id) {
      match.competitive_season_id = season.id;
      touched = true;
    }
    if (nextState === 'completed' && !match.result_recorded_at) {
      match.result_recorded_at = match.updatedAt || new Date();
      touched = true;
    }
    if (nextState === 'completed' && !match.settled_at) {
      match.settled_at = match.result_recorded_at || match.updatedAt || new Date();
      touched = true;
    }

    if (touched) {
      await match.save({ transaction });
      summary.matches_updated += 1;
    }

    for (const player of match.Players || []) {
      const nextCompetitiveResult = skipCompetitiveHistory
        ? null
        : player.competitive_result || player.result || null;
      const nextRatingDelta = skipCompetitiveHistory
        ? 0
        : normalizeNumber(player.rating_delta, player.stars_earned || 0);
      const nextProgressionDelta = skipCompetitiveHistory
        ? 0
        : normalizeNumber(player.progression_points_delta, player.stars_earned || 0);
      const playerTouched = player.competitive_result !== nextCompetitiveResult
        || normalizeNumber(player.rating_delta, 0) !== nextRatingDelta
        || normalizeNumber(player.progression_points_delta, 0) !== nextProgressionDelta;

      if (playerTouched) {
        player.competitive_result = nextCompetitiveResult;
        player.rating_delta = nextRatingDelta;
        player.progression_points_delta = nextProgressionDelta;
        await player.save({ transaction });
        summary.match_players_updated += 1;
      }
    }

    if (skipCompetitiveHistory) {
      summary.manual_partner_matches_skipped = (summary.manual_partner_matches_skipped || 0) + 1;
      continue;
    }

    if (nextState !== 'completed') continue;

    const existingResult = await CompetitiveResult.findOne({
      where: { match_id: match.id },
      transaction,
    });
    if (existingResult) continue;

    const winningSide = inferWinningSideFromPlayers(match.Players || []);
    if (!winningSide) {
      summary.matches_without_result_projection += 1;
      continue;
    }

    await CompetitiveResult.create({
      match_id: match.id,
      season_id: match.competitive_season_id || season?.id || null,
      winning_side: winningSide,
      score: [],
      recorded_by: match.creator_id || null,
      recorded_at: match.result_recorded_at || match.updatedAt || new Date(),
      source_surface: 'legacy-backfill',
    }, { transaction });
    summary.competitive_results_created += 1;
  }
}

async function runCanonicalFoundationBackfill(options = {}) {
  const executor = options.transaction
    ? async (callback) => callback(options.transaction)
    : async (callback) => sequelize.transaction(callback);

  return executor(async (transaction) => {
    const summary = {
      users_updated: 0,
      standings_created: 0,
      standings_updated: 0,
      reputation_ratings_backfilled: 0,
      reputation_profiles_updated: 0,
      slots_updated: 0,
      matches_updated: 0,
      match_players_updated: 0,
      competitive_results_created: 0,
      matches_without_result_projection: 0,
      manual_partner_matches_skipped: 0,
      foundation_created: {
        league: false,
        season: false,
      },
    };

    const foundation = await ensureCanonicalFoundation({
      transaction,
      now: options.now,
      seasonKey: options.seasonKey,
    });
    summary.foundation_created = foundation.created;

    await backfillUsersAndStandings({ league: foundation.league, season: foundation.season, transaction, summary });
    await backfillReputation({ transaction, summary });
    await backfillSlotsAndMatches({ season: foundation.season, transaction, summary });

    return {
      league: {
        id: foundation.league.id,
        key: foundation.league.key,
      },
      season: {
        id: foundation.season.id,
        key: foundation.season.key,
        status: foundation.season.status,
      },
      summary,
    };
  });
}

module.exports = {
  DEFAULT_LEAGUE_KEY,
  buildDefaultSeasonKey,
  ensureCanonicalFoundation,
  buildCompetitiveProjection,
  backfillSlotsAndMatches,
  inferWinningSideFromPlayers,
  isManualPartnerReservationSlot,
  runCanonicalFoundationBackfill,
};
