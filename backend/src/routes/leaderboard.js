const express = require('express');
const { literal } = require('sequelize');
const { User, CompetitiveStanding } = require('../models');
const auth = require('../middleware/auth');
const { buildLeaderboardEntry } = require('../services/competitive/userContracts');
const { getActiveSeasonForLeague } = require('../services/competitive/seasons');
const { runCanonicalFoundationBackfill } = require('../services/competitive/backfill');

const router = express.Router();

const LEADERBOARD_USER_ATTRIBUTES = [
  'id',
  'name',
  'avatar',
  'avatar_seed',
  'position',
  'reputation_avg_score',
  'reputation_ratings_count',
  'league_id',
  'season_id',
  'competitive_category',
  'competitive_tier',
  'competitive_rating',
  'competitive_ranking',
  'progression_points',
  'category_tier',
  'stars',
  'wins',
  'losses',
];

function buildLeaderboardQuery(activeSeasonId, tier) {
  return {
    where: {
      season_id: activeSeasonId,
      tier,
    },
    include: [{
      model: User,
      as: 'User',
      attributes: LEADERBOARD_USER_ATTRIBUTES,
      where: {
        role: 'player',
      },
      required: true,
    }],
    order: [
      [literal('"CompetitiveStanding"."ranking" IS NULL'), 'ASC'],
      ['ranking', 'ASC'],
      ['progression_points', 'DESC'],
      ['rating', 'DESC'],
      ['id', 'ASC'],
    ],
    limit: 50,
  };
}

async function resolveActiveSeasonForRequester(requesterId, preferredLeagueId) {
  let leagueId = preferredLeagueId || null;
  let activeSeason = leagueId ? await getActiveSeasonForLeague(leagueId) : null;

  if (activeSeason) {
    return { activeSeason, leagueId };
  }

  await runCanonicalFoundationBackfill();

  const refreshedUser = await User.findByPk(requesterId, {
    attributes: ['id', 'league_id'],
  });

  leagueId = refreshedUser?.league_id || leagueId || null;
  activeSeason = leagueId ? await getActiveSeasonForLeague(leagueId) : null;

  return { activeSeason, leagueId };
}

router.get('/:category_tier', auth, async (req, res) => {
  try {
    const requestedTier = parseInt(req.params.category_tier, 10);

    if (!Number.isInteger(requestedTier) || requestedTier < 1 || requestedTier > 7) {
      return res.status(400).json({ error: 'Categoria de liga invalida (debe ser un valor 1-7)' });
    }

    const initialLeagueId = req.user?.competitive_context?.league_id || req.user?.league_id || null;
    let { activeSeason, leagueId } = await resolveActiveSeasonForRequester(req.user.id, initialLeagueId);

    if (!activeSeason) {
      return res.json({ leaderboard: [] });
    }

    let leaderboard = await CompetitiveStanding.findAll(
      buildLeaderboardQuery(activeSeason.id, requestedTier)
    );

    if (leaderboard.length === 0) {
      const seasonStandingsCount = await CompetitiveStanding.count({
        where: {
          season_id: activeSeason.id,
          ...(leagueId ? { league_id: leagueId } : {}),
        },
      });

      if (seasonStandingsCount === 0) {
        await runCanonicalFoundationBackfill();
        ({ activeSeason, leagueId } = await resolveActiveSeasonForRequester(req.user.id, leagueId));

        if (activeSeason) {
          leaderboard = await CompetitiveStanding.findAll(
            buildLeaderboardQuery(activeSeason.id, requestedTier)
          );
        }
      }
    }

    return res.json({ leaderboard: leaderboard.map(buildLeaderboardEntry) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error del servidor al cargar el ranking' });
  }
});

module.exports = router;
