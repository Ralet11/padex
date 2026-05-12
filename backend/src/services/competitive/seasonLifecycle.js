const { Op } = require('sequelize');
const { sequelize, League, Season, User, CompetitiveStanding } = require('../../models');
const { categoryFromStars, nameFromTier } = require('../elo');
const { DEFAULT_LEAGUE_KEY } = require('./backfill');
const { getActiveSeasonForLeague } = require('./seasons');

function normalizeNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeDate(value, fallback = null) {
  if (!value) return fallback;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? fallback : value;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function buildChangedValues(current, next) {
  const changed = {};

  for (const [key, value] of Object.entries(next)) {
    if (current[key] !== value) {
      changed[key] = value;
    }
  }

  return changed;
}

async function withOptionalTransaction(transaction, work) {
  if (transaction) {
    return work(transaction);
  }

  return sequelize.transaction(work);
}

async function resolveLeague({ leagueId = null, leagueKey = null, transaction = null } = {}) {
  if (leagueId) {
    const league = await League.findByPk(leagueId, { transaction });
    if (!league) {
      throw new Error(`No se encontro la liga con id ${leagueId}`);
    }
    return league;
  }

  if (leagueKey) {
    const league = await League.findOne({
      where: { key: leagueKey },
      transaction,
    });

    if (!league) {
      throw new Error(`No se encontro la liga con key "${leagueKey}"`);
    }

    return league;
  }

  const defaultLeague = await League.findOne({
    where: { key: DEFAULT_LEAGUE_KEY },
    transaction,
  });

  if (defaultLeague) return defaultLeague;

  const leagues = await League.findAll({
    order: [['id', 'ASC']],
    transaction,
  });

  if (leagues.length === 1) {
    return leagues[0];
  }

  throw new Error('No se pudo resolver la liga. Indica --league-id o --league-key.');
}

async function resolveSeason({
  seasonId = null,
  seasonKey = null,
  leagueId = null,
  allowActiveFallback = false,
  transaction = null,
} = {}) {
  if (seasonId) {
    const season = await Season.findByPk(seasonId, { transaction });
    if (!season) {
      throw new Error(`No se encontro la season con id ${seasonId}`);
    }
    return season;
  }

  if (seasonKey) {
    const season = await Season.findOne({
      where: { key: seasonKey },
      transaction,
    });

    if (!season) {
      throw new Error(`No se encontro la season con key "${seasonKey}"`);
    }

    return season;
  }

  if (allowActiveFallback && leagueId) {
    const activeSeason = await getActiveSeasonForLeague(leagueId, { transaction });
    if (activeSeason) return activeSeason;
  }

  throw new Error('No se pudo resolver la season. Indica --season-id o --season-key.');
}

function buildSeedSnapshot(user, seedMode = 'carry-over') {
  const currentProgressionPoints = Math.max(
    0,
    normalizeNumber(user.progression_points, user.stars || 0)
  );
  const currentTier = user.competitive_tier
    || user.category_tier
    || categoryFromStars(currentProgressionPoints);
  const currentCategory = user.competitive_category
    || user.category
    || nameFromTier(currentTier);
  const currentRating = normalizeNumber(user.competitive_rating, currentProgressionPoints);
  const currentWins = Math.max(0, normalizeNumber(user.wins, 0));
  const currentLosses = Math.max(0, normalizeNumber(user.losses, 0));
  const currentMatchesPlayed = Math.max(
    0,
    normalizeNumber(user.matches_played, currentWins + currentLosses)
  );

  if (seedMode === 'reset') {
    return {
      category: currentCategory,
      tier: currentTier,
      rating: 0,
      ranking: null,
      progression_points: 0,
      wins: 0,
      losses: 0,
      legacy_stars: 0,
      legacy_category_tier: currentTier,
      userSnapshot: {
        stars: 0,
        category_tier: currentTier,
        category: currentCategory,
        competitive_tier: currentTier,
        competitive_category: currentCategory,
        competitive_rating: 0,
        competitive_ranking: null,
        progression_points: 0,
        wins: 0,
        losses: 0,
        matches_played: 0,
      },
    };
  }

  return {
    category: currentCategory,
    tier: currentTier,
    rating: currentRating,
    ranking: null,
    progression_points: currentProgressionPoints,
    wins: currentWins,
    losses: currentLosses,
    legacy_stars: Math.max(0, normalizeNumber(user.stars, currentProgressionPoints)),
    legacy_category_tier: currentTier,
    userSnapshot: {
      stars: currentProgressionPoints,
      category_tier: currentTier,
      category: currentCategory,
      competitive_tier: currentTier,
      competitive_category: currentCategory,
      competitive_rating: currentRating,
      competitive_ranking: null,
      progression_points: currentProgressionPoints,
      wins: currentWins,
      losses: currentLosses,
      matches_played: currentMatchesPlayed,
    },
  };
}

async function assignSeasonRankings({
  seasonId,
  syncUsers = true,
  transaction = null,
} = {}) {
  if (!seasonId) {
    throw new Error('seasonId es requerido para recalcular rankings');
  }

  return withOptionalTransaction(transaction, async (innerTransaction) => {
    const standings = await CompetitiveStanding.findAll({
      where: { season_id: seasonId },
      include: [{
        model: User,
        as: 'User',
        attributes: ['id', 'role', 'season_id'],
        required: false,
      }],
      order: [
        ['tier', 'ASC'],
        ['progression_points', 'DESC'],
        ['rating', 'DESC'],
        ['wins', 'DESC'],
        ['losses', 'ASC'],
        ['user_id', 'ASC'],
      ],
      transaction: innerTransaction,
    });

    let currentTier = null;
    let currentRank = 0;
    let standingsUpdated = 0;
    let usersUpdated = 0;

    for (const standing of standings) {
      if (standing.tier !== currentTier) {
        currentTier = standing.tier;
        currentRank = 1;
      } else {
        currentRank += 1;
      }

      if (standing.ranking !== currentRank) {
        standing.ranking = currentRank;
        await standing.save({ transaction: innerTransaction });
        standingsUpdated += 1;
      }

      if (syncUsers && standing.User && standing.User.role === 'player' && standing.User.season_id === seasonId) {
        const [affected] = await User.update({
          competitive_ranking: currentRank,
        }, {
          where: { id: standing.user_id },
          transaction: innerTransaction,
        });

        usersUpdated += affected;
      }
    }

    return {
      standings_scanned: standings.length,
      standings_updated: standingsUpdated,
      users_updated: usersUpdated,
    };
  });
}

async function seedSeasonFromPlayers({
  season,
  seedMode = 'carry-over',
  transaction = null,
} = {}) {
  if (!season?.id || !season?.league_id) {
    throw new Error('Se requiere una season valida para poblarla');
  }

  return withOptionalTransaction(transaction, async (innerTransaction) => {
    const players = await User.findAll({
      where: {
        league_id: season.league_id,
        role: 'player',
      },
      order: [['id', 'ASC']],
      transaction: innerTransaction,
    });

    const summary = {
      players_scanned: players.length,
      standings_created: 0,
      standings_updated: 0,
      users_updated: 0,
      seed_mode: seedMode,
    };

    for (const player of players) {
      const snapshot = buildSeedSnapshot(player, seedMode);
      const [standing, created] = await CompetitiveStanding.findOrCreate({
        where: {
          user_id: player.id,
          season_id: season.id,
        },
        defaults: {
          user_id: player.id,
          league_id: season.league_id,
          season_id: season.id,
          category: snapshot.category,
          tier: snapshot.tier,
          rating: snapshot.rating,
          ranking: snapshot.ranking,
          progression_points: snapshot.progression_points,
          wins: snapshot.wins,
          losses: snapshot.losses,
          legacy_stars: snapshot.legacy_stars,
          legacy_category_tier: snapshot.legacy_category_tier,
        },
        transaction: innerTransaction,
      });

      if (created) {
        summary.standings_created += 1;
      } else {
        const standingPatch = buildChangedValues(standing, {
          league_id: season.league_id,
          category: snapshot.category,
          tier: snapshot.tier,
          rating: snapshot.rating,
          ranking: snapshot.ranking,
          progression_points: snapshot.progression_points,
          wins: snapshot.wins,
          losses: snapshot.losses,
          legacy_stars: snapshot.legacy_stars,
          legacy_category_tier: snapshot.legacy_category_tier,
        });

        if (Object.keys(standingPatch).length > 0) {
          await standing.update(standingPatch, { transaction: innerTransaction });
          summary.standings_updated += 1;
        }
      }

      const userPatch = buildChangedValues(player, {
        league_id: season.league_id,
        season_id: season.id,
        stars: snapshot.userSnapshot.stars,
        category_tier: snapshot.userSnapshot.category_tier,
        category: snapshot.userSnapshot.category,
        competitive_tier: snapshot.userSnapshot.competitive_tier,
        competitive_category: snapshot.userSnapshot.competitive_category,
        competitive_rating: snapshot.userSnapshot.competitive_rating,
        competitive_ranking: snapshot.userSnapshot.competitive_ranking,
        progression_points: snapshot.userSnapshot.progression_points,
        wins: snapshot.userSnapshot.wins,
        losses: snapshot.userSnapshot.losses,
        matches_played: snapshot.userSnapshot.matches_played,
      });

      if (Object.keys(userPatch).length > 0) {
        await player.update(userPatch, { transaction: innerTransaction });
        summary.users_updated += 1;
      }
    }

    const rankingSummary = await assignSeasonRankings({
      seasonId: season.id,
      syncUsers: true,
      transaction: innerTransaction,
    });

    return {
      ...summary,
      ranking_summary: rankingSummary,
    };
  });
}

async function createCompetitiveSeason(options = {}) {
  return withOptionalTransaction(options.transaction, async (transaction) => {
    const league = await resolveLeague({
      leagueId: options.leagueId,
      leagueKey: options.leagueKey,
      transaction,
    });

    const seasonKey = normalizeText(options.seasonKey);
    const seasonName = normalizeText(options.name);
    const status = normalizeText(options.status || 'pending').toLowerCase();
    const startsAt = normalizeDate(options.startsAt, new Date());
    const endsAt = normalizeDate(options.endsAt, null);
    const seedPlayers = Boolean(options.seedPlayers);
    const finalizeCurrentActive = Boolean(options.finalizeCurrentActive);
    const seedMode = normalizeText(options.seedMode || 'carry-over').toLowerCase();

    if (!seasonKey) {
      throw new Error('seasonKey es requerido');
    }

    if (!seasonName) {
      throw new Error('name es requerido');
    }

    if (!['pending', 'active', 'completed', 'archived'].includes(status)) {
      throw new Error(`Estado de season invalido: ${status}`);
    }

    const existingSeason = await Season.findOne({
      where: { key: seasonKey },
      transaction,
    });

    if (existingSeason) {
      throw new Error(`Ya existe una season con key "${seasonKey}"`);
    }

    let finalizedSeason = null;
    if (finalizeCurrentActive && status === 'active') {
      const currentSeason = await getActiveSeasonForLeague(league.id, { transaction });
      if (currentSeason) {
        finalizedSeason = await finalizeCompetitiveSeason({
          seasonId: currentSeason.id,
          endsAt: options.finalizeEndsAt || startsAt || new Date(),
          transaction,
        });
      }
    }

    const season = await Season.create({
      league_id: league.id,
      key: seasonKey,
      name: seasonName,
      status,
      starts_at: startsAt,
      ends_at: endsAt,
    }, { transaction });

    const seedSummary = seedPlayers
      ? await seedSeasonFromPlayers({
          season,
          seedMode,
          transaction,
        })
      : null;

    return {
      league: {
        id: league.id,
        key: league.key,
        name: league.name,
      },
      season: {
        id: season.id,
        key: season.key,
        name: season.name,
        status: season.status,
        starts_at: season.starts_at,
        ends_at: season.ends_at,
      },
      finalized_previous_season: finalizedSeason
        ? {
            id: finalizedSeason.season.id,
            key: finalizedSeason.season.key,
            status: finalizedSeason.season.status,
          }
        : null,
      seed_summary: seedSummary,
    };
  });
}

async function finalizeCompetitiveSeason(options = {}) {
  return withOptionalTransaction(options.transaction, async (transaction) => {
    const league = options.leagueId || options.leagueKey
      ? await resolveLeague({
          leagueId: options.leagueId,
          leagueKey: options.leagueKey,
          transaction,
        })
      : null;

    const season = await resolveSeason({
      seasonId: options.seasonId,
      seasonKey: options.seasonKey,
      leagueId: league?.id || null,
      allowActiveFallback: Boolean(options.allowActiveFallback),
      transaction,
    });

    const finalStatus = normalizeText(options.finalStatus || 'completed').toLowerCase();
    const endsAt = normalizeDate(options.endsAt, new Date());

    if (!['completed', 'archived'].includes(finalStatus)) {
      throw new Error(`Estado final invalido: ${finalStatus}`);
    }

    const rankingSummary = await assignSeasonRankings({
      seasonId: season.id,
      syncUsers: false,
      transaction,
    });

    const patch = buildChangedValues(season, {
      status: finalStatus,
      ends_at: endsAt,
    });

    if (Object.keys(patch).length > 0) {
      await season.update(patch, { transaction });
    }

    return {
      season: {
        id: season.id,
        key: season.key,
        name: season.name,
        status: finalStatus,
        starts_at: season.starts_at,
        ends_at: endsAt,
      },
      ranking_summary: rankingSummary,
    };
  });
}

async function rolloverCompetitiveSeason(options = {}) {
  return withOptionalTransaction(options.transaction, async (transaction) => {
    const league = await resolveLeague({
      leagueId: options.leagueId,
      leagueKey: options.leagueKey,
      transaction,
    });

    const currentSeason = await resolveSeason({
      seasonId: options.currentSeasonId,
      seasonKey: options.currentSeasonKey,
      leagueId: league.id,
      allowActiveFallback: true,
      transaction,
    });

    const nextSeasonKey = normalizeText(options.nextSeasonKey);
    const nextSeasonName = normalizeText(options.nextSeasonName);
    const nextStatus = normalizeText(options.nextStatus || 'active').toLowerCase();
    const nextStartsAt = normalizeDate(options.nextStartsAt, new Date());
    const nextEndsAt = normalizeDate(options.nextEndsAt, null);
    const finalizesAt = normalizeDate(options.finalizeEndsAt, nextStartsAt || new Date());
    const seedMode = normalizeText(options.seedMode || 'carry-over').toLowerCase();

    if (!nextSeasonKey) {
      throw new Error('nextSeasonKey es requerido');
    }

    if (!nextSeasonName) {
      throw new Error('nextSeasonName es requerido');
    }

    const finalizedSeason = currentSeason
      ? await finalizeCompetitiveSeason({
          seasonId: currentSeason.id,
          endsAt: finalizesAt,
          finalStatus: 'completed',
          transaction,
        })
      : null;

    const createdSeason = await createCompetitiveSeason({
      leagueId: league.id,
      seasonKey: nextSeasonKey,
      name: nextSeasonName,
      status: nextStatus,
      startsAt: nextStartsAt,
      endsAt: nextEndsAt,
      seedPlayers: true,
      seedMode,
      finalizeCurrentActive: false,
      transaction,
    });

    return {
      league: createdSeason.league,
      previous_season: finalizedSeason?.season || null,
      next_season: createdSeason.season,
      seed_summary: createdSeason.seed_summary,
    };
  });
}

module.exports = {
  resolveLeague,
  resolveSeason,
  assignSeasonRankings,
  seedSeasonFromPlayers,
  createCompetitiveSeason,
  finalizeCompetitiveSeason,
  rolloverCompetitiveSeason,
};
