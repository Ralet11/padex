process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/padex';

const assert = require('assert');
const jwt = require('jsonwebtoken');

const seasons = require('./src/services/competitive/seasons');
const models = require('./src/models');
const matchLifecycle = require('./src/services/competitive/matchLifecycle');
const backfill = require('./src/services/competitive/backfill');
const authMiddleware = require('./src/middleware/auth');
const { buildCanonicalUserPayload, buildLeaderboardEntry, buildProfileUserPayload } = require('./src/services/competitive/userContracts');

const progressionPath = require.resolve('./src/services/competitive/progression');
delete require.cache[progressionPath];

const originalSeasonFns = {
  getActiveSeasonForLeague: seasons.getActiveSeasonForLeague,
  ensureStandingForSeason: seasons.ensureStandingForSeason,
  buildSeasonResetContext: seasons.buildSeasonResetContext,
};

const season = { id: 77, league_id: 15, key: 'padex-foundation-2026', name: 'Temporada 2026 Fundacional', status: 'active' };

seasons.getActiveSeasonForLeague = async () => season;
seasons.ensureStandingForSeason = async (user) => ({ standing: user.__standing, reset_applied: user.id === 1 });
seasons.buildSeasonResetContext = originalSeasonFns.buildSeasonResetContext;

const { applyCompetitiveCompletion, normalizeCompletionPayload } = require('./src/services/competitive/progression');
const { submitReputationRating } = require('./src/services/reputation/service');
const teams = require('./src/services/competitive/teams');

async function testCompetitiveCompletionFlow() {
  const originalFns = {
    userFindByPk: models.User.findByPk,
    matchUpdate: models.Match.update,
    matchPlayerUpdate: models.MatchPlayer.update,
    competitiveResultCreate: models.CompetitiveResult.create,
  };

  const matchPlayerUpdates = [];
  let competitiveResultPayload = null;

  const usersById = new Map([1, 2, 3, 4].map((id, index) => {
    const standing = {
      progression_points: 100 * (index + 1),
      rating: 100 * (index + 1),
      wins: 0,
      losses: 0,
      league_id: null,
      category: '7ma',
      tier: 7,
      legacy_stars: 0,
      legacy_category_tier: 7,
      async save() { return this; },
    };

    return [id, {
      id,
      league_id: 15,
      season_id: null,
      stars: 100 * (index + 1),
      category_tier: 7,
      category: '7ma',
      progression_points: 100 * (index + 1),
      competitive_rating: 100 * (index + 1),
      competitive_tier: 7,
      competitive_category: '7ma',
      matches_played: 0,
      wins: 0,
      losses: 0,
      __standing: standing,
      async save() { return this; },
    }];
  }));

  models.User.findByPk = async (id) => usersById.get(id);
  models.Match.update = async () => [1];
  models.MatchPlayer.update = async (payload, options) => {
    matchPlayerUpdates.push({ payload, options });
    return [1];
  };
  models.CompetitiveResult.create = async (payload) => {
    competitiveResultPayload = payload;
    return { id: 501, ...payload };
  };

  const fakeMatch = {
    id: 300,
    slot_id: 901,
    max_players: 4,
    competitive_season_id: null,
    Players: [
      { id: 11, team: null, createdAt: '2026-04-01T10:00:00.000Z', User: { id: 1, category_tier: 7 } },
      { id: 12, team: null, createdAt: '2026-04-01T10:01:00.000Z', User: { id: 2, category_tier: 7 } },
      { id: 13, team: null, createdAt: '2026-04-01T10:02:00.000Z', User: { id: 3, category_tier: 7 } },
      { id: 14, team: null, createdAt: '2026-04-01T10:03:00.000Z', User: { id: 4, category_tier: 7 } },
    ],
    async getCompetitiveSeason() { return null; },
  };

  const normalized = normalizeCompletionPayload(fakeMatch, {
    winning_side: 'A',
    score: [{ a: 6, b: 4 }, { a: 6, b: 3 }],
  });

  assert.strictEqual(normalized.has_canonical_result, true);
  assert.deepStrictEqual(normalized.winners, [1, 2]);

  const completion = await applyCompetitiveCompletion({
    match: fakeMatch,
    completedBy: { id: 1, league_id: 15 },
    payload: {
      winning_side: 'A',
      score: [{ a: 6, b: 4 }, { a: 6, b: 3 }],
    },
    transaction: {},
  });

  const managedMatch = { state: 'reserved', async update(payload) { Object.assign(this, payload); return this; } };
  const managedSlot = { state: 'reserved', booked_externally: false, async update(payload) { Object.assign(this, payload); return this; } };
  await matchLifecycle.updateMatchLifecycle(managedMatch, 'completed');
  await matchLifecycle.updateSlotLifecycle(managedSlot, 'completed');

  assert.strictEqual(managedMatch.state, 'completed');
  assert.strictEqual(managedSlot.state, 'completed');
  assert.strictEqual(completion.competitive_result_id, 501);
  assert.strictEqual(completion.player_updates.length, 4);
  assert.strictEqual(matchPlayerUpdates.length, 8);
  assert.strictEqual(competitiveResultPayload.winning_side, 'A');
  assert.deepStrictEqual(fakeMatch.Players.map((player) => player.team), ['A', 'A', 'B', 'B']);
  assert.strictEqual(usersById.get(1).wins, 1);
  assert.strictEqual(usersById.get(3).losses, 1);

  models.User.findByPk = originalFns.userFindByPk;
  models.Match.update = originalFns.matchUpdate;
  models.MatchPlayer.update = originalFns.matchPlayerUpdate;
  models.CompetitiveResult.create = originalFns.competitiveResultCreate;
}

async function testCompetitiveCompletionRequiresCanonicalWinningSide() {
  const originalMatchPlayerUpdate = models.MatchPlayer.update;
  models.MatchPlayer.update = async () => [1];

  const fakeMatch = {
    id: 301,
    max_players: 4,
    competitive_season_id: 77,
    Players: [
      { id: 21, team: 'A', createdAt: '2026-04-01T10:00:00.000Z', User: { id: 1, category_tier: 7 } },
      { id: 22, team: 'A', createdAt: '2026-04-01T10:01:00.000Z', User: { id: 2, category_tier: 7 } },
      { id: 23, team: 'B', createdAt: '2026-04-01T10:02:00.000Z', User: { id: 3, category_tier: 7 } },
      { id: 24, team: 'B', createdAt: '2026-04-01T10:03:00.000Z', User: { id: 4, category_tier: 7 } },
    ],
    async getCompetitiveSeason() { return season; },
  };

  let error = null;
  try {
    await applyCompetitiveCompletion({
      match: fakeMatch,
      completedBy: { id: 1, league_id: 15 },
      payload: { winners: [1, 3], source: 'mobile' },
      transaction: {},
    });
  } catch (err) {
    error = err;
  }

  assert.ok(error);
  assert.strictEqual(error.message, 'No se pudo determinar el lado ganador canonico del partido');
  models.MatchPlayer.update = originalMatchPlayerUpdate;
}

async function testCompetitiveCompletionRejectsInvalidWinnerDistribution() {
  const originalMatchPlayerUpdate = models.MatchPlayer.update;
  models.MatchPlayer.update = async () => [1];

  const fakeMatch = {
    id: 302,
    max_players: 4,
    competitive_season_id: 77,
    Players: [
      { id: 31, team: 'A', createdAt: '2026-04-01T10:00:00.000Z', User: { id: 1, category_tier: 7 } },
      { id: 32, team: 'A', createdAt: '2026-04-01T10:01:00.000Z', User: { id: 2, category_tier: 7 } },
      { id: 33, team: 'B', createdAt: '2026-04-01T10:02:00.000Z', User: { id: 3, category_tier: 7 } },
      { id: 34, team: 'B', createdAt: '2026-04-01T10:03:00.000Z', User: { id: 4, category_tier: 7 } },
    ],
    async getCompetitiveSeason() { return season; },
  };

  let error = null;
  try {
    await applyCompetitiveCompletion({
      match: fakeMatch,
      completedBy: { id: 1, league_id: 15 },
      payload: { winners: [1, 2], winning_side: 'B', source: 'mobile' },
      transaction: {},
    });
  } catch (err) {
    error = err;
  }

  assert.ok(error);
  assert.strictEqual(error.message, 'El lado ganador no coincide con los jugadores marcados como ganadores');
  models.MatchPlayer.update = originalMatchPlayerUpdate;
}

async function testReputationBackfillAndSummary() {
  const originalFns = {
    sequelizeTransaction: models.sequelize.transaction,
    reputationFindOne: models.ReputationRating.findOne,
    reputationCreate: models.ReputationRating.create,
    profileFindOrCreate: models.ReputationProfile.findOrCreate,
    ratingFindOrCreate: models.Rating.findOrCreate,
    userUpdate: models.User.update,
  };

  const ratings = [];
  const profile = {
    id: 701,
    avg_score: 0,
    ratings_count: 0,
    last_rated_at: null,
    async save() { return this; },
  };
  let updatedUserSummary = null;

  models.sequelize.transaction = async (callback) => callback({});
  models.ReputationRating.findOne = async (options) => {
    if (options.attributes) {
      const avg = ratings.reduce((acc, item) => acc + item.score, 0) / ratings.length;
      return { avg_score: avg, total: ratings.length };
    }

    return ratings.find((item) => item.rater_id === options.where.rater_id && item.rated_id === options.where.rated_id && item.match_id === options.where.match_id) || null;
  };
  models.ReputationRating.create = async (payload) => {
    ratings.push(payload);
    return payload;
  };
  models.ReputationProfile.findOrCreate = async () => [profile, false];
  models.Rating.findOrCreate = async () => [{}, true];
  models.User.update = async (payload) => {
    updatedUserSummary = payload;
    return [1];
  };

  const result = await submitReputationRating({
    raterId: 1,
    ratedId: 2,
    matchId: 300,
    score: 5,
    comment: 'Jugador confiable',
  });

  assert.strictEqual(result.avg_score, 5);
  assert.strictEqual(result.total, 1);
  assert.strictEqual(profile.avg_score, 5);
  assert.strictEqual(profile.ratings_count, 1);
  assert.deepStrictEqual(updatedUserSummary, { reputation_avg_score: 5, reputation_ratings_count: 1 });

  models.sequelize.transaction = originalFns.sequelizeTransaction;
  models.ReputationRating.findOne = originalFns.reputationFindOne;
  models.ReputationRating.create = originalFns.reputationCreate;
  models.ReputationProfile.findOrCreate = originalFns.profileFindOrCreate;
  models.Rating.findOrCreate = originalFns.ratingFindOrCreate;
  models.User.update = originalFns.userUpdate;
}

function testBackfillInferenceHelpers() {
  const winningSide = backfill.inferWinningSideFromPlayers([
    { id: 1, team: null, createdAt: '2026-04-01T10:00:00.000Z', competitive_result: 'win' },
    { id: 2, team: null, createdAt: '2026-04-01T10:01:00.000Z', competitive_result: 'win' },
    { id: 3, team: null, createdAt: '2026-04-01T10:02:00.000Z', competitive_result: 'loss' },
    { id: 4, team: null, createdAt: '2026-04-01T10:03:00.000Z', competitive_result: 'loss' },
  ]);

  const projection = backfill.buildCompetitiveProjection({
    stars: 420,
    category_tier: 6,
    category: '6ta',
    progression_points: null,
    competitive_rating: null,
  }, 15, 77);

  assert.strictEqual(winningSide, 'A');
  assert.strictEqual(projection.league_id, 15);
  assert.strictEqual(projection.season_id, 77);
  assert.strictEqual(projection.progression_points, 420);
  assert.strictEqual(projection.tier, 6);
  assert.strictEqual(teams.getCanonicalSideForIndex(0, 4), 'A');
  assert.strictEqual(teams.getCanonicalSideForIndex(2, 4), 'B');
  assert.strictEqual(backfill.isManualPartnerReservationSlot({ booked_externally: true }), true);
  assert.strictEqual(backfill.isManualPartnerReservationSlot({ occupant_name: 'Reserva manual' }), true);
}

async function testSameSeasonStandingHydratesFromUserSnapshot() {
  const originalFindOrCreate = models.CompetitiveStanding.findOrCreate;
  let receivedDefaults = null;

  models.CompetitiveStanding.findOrCreate = async (options) => {
    receivedDefaults = options.defaults;
    return [{ ...options.defaults }, true];
  };

  const user = {
    id: 90,
    league_id: 15,
    season_id: 77,
    stars: 640,
    category_tier: 5,
    category: '5ta',
    progression_points: 630,
    competitive_rating: 655,
    competitive_tier: 5,
    competitive_category: '5ta',
    wins: 12,
    losses: 4,
  };

  const ensured = await originalSeasonFns.ensureStandingForSeason(user, season, { transaction: {} });

  assert.ok(receivedDefaults);
  assert.strictEqual(receivedDefaults.progression_points, 630);
  assert.strictEqual(receivedDefaults.rating, 655);
  assert.strictEqual(receivedDefaults.wins, 12);
  assert.strictEqual(receivedDefaults.losses, 4);
  assert.strictEqual(ensured.reset_applied, false);
  assert.strictEqual(ensured.hydrated_from_user_snapshot, true);

  models.CompetitiveStanding.findOrCreate = originalFindOrCreate;
}

async function testNewSeasonStandingResetsFromPreviousSnapshot() {
  const originalFindOrCreate = models.CompetitiveStanding.findOrCreate;
  let receivedDefaults = null;

  models.CompetitiveStanding.findOrCreate = async (options) => {
    receivedDefaults = options.defaults;
    return [{ ...options.defaults }, true];
  };

  const user = {
    id: 91,
    league_id: 15,
    season_id: 12,
    stars: 640,
    category_tier: 5,
    category: '5ta',
    progression_points: 630,
    competitive_rating: 655,
    competitive_tier: 5,
    competitive_category: '5ta',
    wins: 12,
    losses: 4,
  };

  const ensured = await originalSeasonFns.ensureStandingForSeason(user, season, { transaction: {} });
  const resetContext = originalSeasonFns.buildSeasonResetContext(season, ensured.reset_applied, ensured);

  assert.ok(receivedDefaults);
  assert.strictEqual(receivedDefaults.progression_points, 0);
  assert.strictEqual(receivedDefaults.rating, 0);
  assert.strictEqual(receivedDefaults.wins, 0);
  assert.strictEqual(receivedDefaults.losses, 0);
  assert.strictEqual(ensured.reset_applied, true);
  assert.strictEqual(ensured.hydrated_from_user_snapshot, false);
  assert.strictEqual(ensured.previous_season_id, 12);
  assert.strictEqual(resetContext.reset_applied, true);
  assert.strictEqual(resetContext.previous_season_id, 12);
  assert.strictEqual(resetContext.standing_source, 'season_reset');

  models.CompetitiveStanding.findOrCreate = originalFindOrCreate;
}

function testLifecycleCompletionGuards() {
  let error = null;

  try {
    matchLifecycle.assertCompetitiveCompletionLifecycle(
      { state: 'open' },
      { state: 'available', booked_externally: false }
    );
  } catch (err) {
    error = err;
  }

  assert.ok(error);
  assert.strictEqual(error.code, 'INVALID_LIFECYCLE_TRANSITION');
  assert.strictEqual(error.entity, 'match');
  assert.strictEqual(error.message, 'Transicion invalida de match: open -> completed');

  assert.doesNotThrow(() => {
    matchLifecycle.assertCompetitiveCompletionLifecycle(
      { state: 'reserved' },
      { state: 'reserved', booked_externally: false }
    );
  });

  error = null;
  try {
    matchLifecycle.assertCompetitiveCompletionLifecycle(
      { state: 'reserved' },
      { state: 'available', booked_externally: false }
    );
  } catch (err) {
    error = err;
  }

  assert.ok(error);
  assert.strictEqual(error.entity, 'slot');
  assert.strictEqual(error.message, 'Transicion invalida de slot: available -> completed');
}

async function testBackfillSkipsManualPartnerReservations() {
  const originalFns = {
    slotFindAll: models.Slot.findAll,
    matchFindAll: models.Match.findAll,
    competitiveResultFindOne: models.CompetitiveResult.findOne,
    competitiveResultCreate: models.CompetitiveResult.create,
  };

  const manualPlayer = {
    id: 41,
    team: null,
    result: 'win',
    competitive_result: null,
    rating_delta: null,
    progression_points_delta: null,
    stars_earned: 8,
    async save() { return this; },
  };
  const managedPlayers = [
    { id: 51, team: 'A', result: 'win', competitive_result: null, rating_delta: null, progression_points_delta: null, stars_earned: 10, async save() { return this; } },
    { id: 52, team: 'A', result: 'win', competitive_result: null, rating_delta: null, progression_points_delta: null, stars_earned: 10, async save() { return this; } },
    { id: 53, team: 'B', result: 'loss', competitive_result: null, rating_delta: null, progression_points_delta: null, stars_earned: -10, async save() { return this; } },
    { id: 54, team: 'B', result: 'loss', competitive_result: null, rating_delta: null, progression_points_delta: null, stars_earned: -10, async save() { return this; } },
  ];

  const matches = [
    {
      id: 401,
      state: 'completed',
      status: 'completed',
      competitive_season_id: null,
      result_recorded_at: null,
      settled_at: null,
      updatedAt: new Date('2026-04-02T10:00:00.000Z'),
      creator_id: 1,
      Slot: { booked_externally: true, occupant_name: 'Reserva manual', occupant_phone: '123' },
      Players: [manualPlayer],
      async save() { return this; },
    },
    {
      id: 402,
      state: 'completed',
      status: 'completed',
      competitive_season_id: null,
      result_recorded_at: null,
      settled_at: null,
      updatedAt: new Date('2026-04-02T10:05:00.000Z'),
      creator_id: 1,
      Slot: { booked_externally: false, occupant_name: null, occupant_phone: null },
      Players: managedPlayers,
      async save() { return this; },
    },
  ];

  const summary = {
    matches_updated: 0,
    match_players_updated: 0,
    competitive_results_created: 0,
    matches_without_result_projection: 0,
    manual_partner_matches_skipped: 0,
  };
  const createdResults = [];

  models.Slot.findAll = async () => [];
  models.Match.findAll = async () => matches;
  models.CompetitiveResult.findOne = async () => null;
  models.CompetitiveResult.create = async (payload) => {
    createdResults.push(payload);
    return payload;
  };

  await backfill.backfillSlotsAndMatches({ season, transaction: {}, summary });

  assert.strictEqual(matches[0].competitive_season_id, null);
  assert.strictEqual(manualPlayer.competitive_result, null);
  assert.strictEqual(createdResults.some((item) => item.match_id === 401), false);
  assert.strictEqual(matches[1].competitive_season_id, 77);
  assert.strictEqual(createdResults.some((item) => item.match_id === 402), true);
  assert.strictEqual(summary.manual_partner_matches_skipped, 1);

  models.Slot.findAll = originalFns.slotFindAll;
  models.Match.findAll = originalFns.matchFindAll;
  models.CompetitiveResult.findOne = originalFns.competitiveResultFindOne;
  models.CompetitiveResult.create = originalFns.competitiveResultCreate;
}

async function testAuthMiddlewareHydratesCompetitiveContextFromDatabase() {
  const originalVerify = jwt.verify;
  const originalFindByPk = models.User.findByPk;

  jwt.verify = () => ({ id: 15, email: 'token@example.com', role: 'player', category_tier: 7 });
  models.User.findByPk = async () => ({
    toJSON() {
      return {
        id: 15,
        email: 'db@example.com',
        role: 'player',
        league_id: 3,
        season_id: 9,
        category_tier: 4,
        competitive_tier: 4,
        competitive_category: '4ta',
        competitive_rating: 812,
        competitive_ranking: 11,
        progression_points: 812,
      };
    }
  });

  const req = { headers: { authorization: 'Bearer token' } };
  let nextCalled = false;
  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };

  await authMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.strictEqual(nextCalled, true);
  assert.strictEqual(req.user.email, 'db@example.com');
  assert.strictEqual(req.user.category_tier, 4);
  assert.strictEqual(req.user.competitive_context.tier, 4);
  assert.strictEqual(req.user.competitive_context.season_id, 9);

  jwt.verify = originalVerify;
  models.User.findByPk = originalFindByPk;
}

function testCanonicalUserContractsPreserveLegacyCompatibility() {
  const baseUser = {
    id: 22,
    name: 'Lola',
    avatar: '/avatar.png',
    stars: 520,
    wins: 18,
    losses: 6,
    position: 'drive',
    category_tier: 5,
    league_id: 2,
    season_id: 77,
    competitive_category: '5ta',
    competitive_tier: 5,
    competitive_rating: 525,
    competitive_ranking: 8,
    progression_points: 520,
    reputation_avg_score: 4.7,
    reputation_ratings_count: 14,
  };

  const authPayload = buildCanonicalUserPayload(baseUser);
  const profilePayload = buildProfileUserPayload(baseUser, { avg_score: 4.7, total_ratings: 14 });
  const leaderboardEntry = buildLeaderboardEntry({
    user_id: 22,
    league_id: 2,
    season_id: 77,
    category: '4ta',
    tier: 4,
    rating: 611,
    ranking: 2,
    progression_points: 610,
    wins: 20,
    losses: 3,
    User: baseUser,
  });

  assert.strictEqual(authPayload.competitive_context.tier, 5);
  assert.strictEqual(authPayload.competitive_context.ranking, 8);
  assert.strictEqual(authPayload.reputation_summary.avg_score, 4.7);
  assert.strictEqual(authPayload.stars, 520);
  assert.strictEqual(authPayload.category_tier, 5);
  assert.strictEqual(profilePayload.avg_rating, 4.7);
  assert.strictEqual(profilePayload.total_ratings, 14);
  assert.strictEqual(profilePayload.reputation_summary.ratings_count, 14);
  assert.strictEqual(leaderboardEntry.competitive_context.season_id, 77);
  assert.strictEqual(leaderboardEntry.competitive_context.tier, 4);
  assert.strictEqual(leaderboardEntry.competitive_context.ranking, 2);
  assert.strictEqual(leaderboardEntry.stars, 610);
  assert.strictEqual(leaderboardEntry.wins, 20);
}

async function main() {
  try {
    await testCompetitiveCompletionFlow();
    await testCompetitiveCompletionRequiresCanonicalWinningSide();
    await testCompetitiveCompletionRejectsInvalidWinnerDistribution();
    await testReputationBackfillAndSummary();
    testBackfillInferenceHelpers();
    await testSameSeasonStandingHydratesFromUserSnapshot();
    await testNewSeasonStandingResetsFromPreviousSnapshot();
    testLifecycleCompletionGuards();
    await testBackfillSkipsManualPartnerReservations();
    await testAuthMiddlewareHydratesCompetitiveContextFromDatabase();
    testCanonicalUserContractsPreserveLegacyCompatibility();
    console.log('competitive foundation verification: ok');
  } catch (error) {
    console.error('competitive foundation verification: failed');
    console.error(error);
    process.exitCode = 1;
  } finally {
    seasons.getActiveSeasonForLeague = originalSeasonFns.getActiveSeasonForLeague;
    seasons.ensureStandingForSeason = originalSeasonFns.ensureStandingForSeason;
    seasons.buildSeasonResetContext = originalSeasonFns.buildSeasonResetContext;
    await models.sequelize.close().catch(() => {});
  }
}

main();
