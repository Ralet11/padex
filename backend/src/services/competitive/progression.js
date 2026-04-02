const { CompetitiveResult, Match, MatchPlayer, User } = require('../../models');
const { RESULT_OUTCOMES, RESULT_SIDES } = require('../../constants/domainEvents');
const {
  createCompetitiveResultContract,
  isCanonicalCompetitiveResult,
} = require('../../contracts/competitiveResult');
const { calculateStarsEarned, categoryFromStars, nameFromTier } = require('../elo');
const {
  getActiveSeasonForLeague,
  ensureStandingForSeason,
  buildSeasonResetContext,
} = require('./seasons');
const {
  ensureCanonicalTeamsForMatchPlayers,
  getEffectivePlayerSide,
  inferWinningSideFromWinnerIds,
} = require('./teams');

function normalizeScore(score) {
  if (!Array.isArray(score)) return [];

  return score
    .map((setScore) => ({
      a: Number(setScore?.a),
      b: Number(setScore?.b),
    }))
    .filter((setScore) => Number.isInteger(setScore.a) && Number.isInteger(setScore.b));
}

function inferWinningSideFromPlayers(players, winners) {
  return inferWinningSideFromWinnerIds(players, winners);
}

function resolveWinnersFromWinningSide(players, winningSide) {
  if (!Object.values(RESULT_SIDES).includes(winningSide)) return [];

  return players
    .filter((player) => getEffectivePlayerSide(player, { players }) === winningSide)
    .map((player) => player.User.id);
}

function normalizeCompletionPayload(match, payload = {}) {
  const players = match?.Players || [];
  const winners = Array.isArray(payload.winners)
    ? [...new Set(payload.winners.map((value) => Number(value)).filter(Number.isInteger))]
    : [];

  const normalizedScore = normalizeScore(payload.result?.score || payload.score);
  const providedWinningSide = payload.result?.winning_side || payload.winning_side || null;
  const inferredWinningSide = inferWinningSideFromPlayers(players, winners);
  const winningSide = providedWinningSide || inferredWinningSide;
  const derivedWinners = winners.length > 0 ? winners : resolveWinnersFromWinningSide(players, winningSide);
  const canonicalResult = createCompetitiveResultContract({
    winning_side: winningSide,
    score: normalizedScore,
    recorded_by: payload.result?.recorded_by || payload.recorded_by || null,
    source: payload.result?.source || payload.source || 'backend',
  });

  return {
    winners: derivedWinners,
    provided_winning_side: providedWinningSide,
    inferred_winning_side: inferredWinningSide,
    winning_side: winningSide,
    score: normalizedScore,
    canonical_result: canonicalResult,
    has_canonical_result: isCanonicalCompetitiveResult(canonicalResult),
  };
}

async function applyCompetitiveCompletion({ match, completedBy, payload, transaction }) {
  await ensureCanonicalTeamsForMatchPlayers(match.Players || [], {
    transaction,
    maxPlayers: match.max_players,
  });

  const normalized = normalizeCompletionPayload(match, payload);
  const players = match.Players || [];
  const winnerSet = new Set(normalized.winners);

  if (normalized.provided_winning_side
    && normalized.inferred_winning_side
    && normalized.provided_winning_side !== normalized.inferred_winning_side) {
    throw new Error('El lado ganador no coincide con los jugadores marcados como ganadores');
  }

  if (!Object.values(RESULT_SIDES).includes(normalized.winning_side)) {
    throw new Error('No se pudo determinar el lado ganador canonico del partido');
  }

  if (winnerSet.size === 0) {
    throw new Error('Debe proveer un ganador valido para completar el partido');
  }

  const winningPlayers = players.filter((player) => winnerSet.has(player.User.id));
  const losingPlayers = players.filter((player) => !winnerSet.has(player.User.id));

  if (winningPlayers.length === 0 || losingPlayers.length === 0) {
    throw new Error('El resultado competitivo debe incluir ganadores y perdedores');
  }

  const winningAvgTier = winningPlayers.reduce((acc, player) => acc + player.User.category_tier, 0) / winningPlayers.length;
  const losingAvgTier = losingPlayers.reduce((acc, player) => acc + player.User.category_tier, 0) / losingPlayers.length;

  let season = null;
  if (match.competitive_season_id) {
    season = await match.getCompetitiveSeason({ transaction });
  }
  if (!season && completedBy?.league_id) {
    season = await getActiveSeasonForLeague(completedBy.league_id, { transaction });
  }
  if (season && match.competitive_season_id !== season.id) {
    await Match.update({ competitive_season_id: season.id }, { where: { id: match.id }, transaction });
  }

  const playerUpdates = [];
  let resetApplied = false;
  let standingSource = null;
  let previousSeasonId = null;

  for (const player of players) {
    const isWinner = winnerSet.has(player.User.id);
    const user = await User.findByPk(player.User.id, { transaction });
    const starsEarned = isWinner
      ? calculateStarsEarned(winningAvgTier, losingAvgTier, RESULT_OUTCOMES.WIN)
      : calculateStarsEarned(losingAvgTier, winningAvgTier, RESULT_OUTCOMES.LOSS);

    const {
      standing,
      reset_applied,
      hydrated_from_user_snapshot,
      previous_season_id,
    } = await ensureStandingForSeason(user, season, { transaction });
    if (reset_applied) resetApplied = true;
    if (!standingSource) {
      standingSource = hydrated_from_user_snapshot ? 'user_snapshot' : (reset_applied ? 'season_reset' : 'existing_standing');
    }
    if (previousSeasonId == null && previous_season_id != null) {
      previousSeasonId = previous_season_id;
    }

    const nextProgression = Math.max(0, Number((standing?.progression_points ?? user.progression_points) || 0) + starsEarned);
    const nextRating = Number((standing?.rating ?? user.competitive_rating) || 0) + starsEarned;
    const nextTier = categoryFromStars(nextProgression);

    if (standing) {
      standing.league_id = season?.league_id || user.league_id || standing.league_id;
      standing.category = nameFromTier(nextTier);
      standing.tier = nextTier;
      standing.rating = nextRating;
      standing.progression_points = nextProgression;
      standing.wins += isWinner ? 1 : 0;
      standing.losses += isWinner ? 0 : 1;
      standing.legacy_stars = nextProgression;
      standing.legacy_category_tier = nextTier;
      await standing.save({ transaction });
    }

    user.stars = nextProgression;
    user.category_tier = nextTier;
    user.category = nameFromTier(nextTier);
    user.progression_points = nextProgression;
    user.competitive_rating = nextRating;
    user.competitive_tier = nextTier;
    user.competitive_category = nameFromTier(nextTier);
    user.season_id = season?.id || user.season_id;
    user.matches_played += 1;
    user.wins += isWinner ? 1 : 0;
    user.losses += isWinner ? 0 : 1;
    await user.save({ transaction });

    const competitiveResult = isWinner ? RESULT_OUTCOMES.WIN : RESULT_OUTCOMES.LOSS;
    await MatchPlayer.update({
      result: competitiveResult,
      competitive_result: competitiveResult,
      stars_earned: starsEarned,
      rating_delta: starsEarned,
      progression_points_delta: starsEarned,
    }, {
      where: { id: player.id },
      transaction,
    });

    playerUpdates.push({
      user_id: user.id,
      competitive_result: competitiveResult,
      stars_earned: starsEarned,
      rating_delta: starsEarned,
      progression_points_delta: starsEarned,
      tier: nextTier,
      progression_points: nextProgression,
    });
  }

  const competitiveResultRecord = await CompetitiveResult.create({
    match_id: match.id,
    season_id: season?.id || match.competitive_season_id || null,
    winning_side: normalized.winning_side,
    score: normalized.score,
    recorded_by: completedBy?.id || normalized.canonical_result.recorded_by,
    source_surface: normalized.canonical_result.source,
  }, { transaction });

  return {
    normalized,
    competitive_result_id: competitiveResultRecord.id,
    player_updates: playerUpdates,
    season_context: buildSeasonResetContext(season, resetApplied, {
      hydrated_from_user_snapshot: standingSource === 'user_snapshot',
      previous_season_id: previousSeasonId,
    }),
  };
}

module.exports = {
  normalizeCompletionPayload,
  applyCompetitiveCompletion,
};
