const { attachLegacyCompatibility } = require('./legacyMapping');

function toPlainUser(user = {}) {
  const data = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
  delete data.password;
  return data;
}

function buildCanonicalUserPayload(user, payload = {}, sourceOverrides = {}) {
  const userData = toPlainUser(user);
  const source = { ...userData, ...sourceOverrides };

  return attachLegacyCompatibility({
    ...userData,
    ...payload,
  }, source);
}

function buildProfileUserPayload(user, reputationSummary = {}) {
  const avgScore = reputationSummary.avg_score ?? null;
  const totalRatings = Number(reputationSummary.total_ratings ?? reputationSummary.ratings_count ?? 0);

  return buildCanonicalUserPayload(user, {
    avg_rating: avgScore,
    total_ratings: totalRatings,
  }, {
    reputation_avg_score: avgScore ?? 0,
    reputation_ratings_count: totalRatings,
  });
}

function buildLeaderboardEntry(user) {
  const userData = toPlainUser(user);
  const standingUser = userData.User ? toPlainUser(userData.User) : null;
  const source = standingUser
    ? {
        ...standingUser,
        ...userData,
        competitive_category: userData.category ?? standingUser.competitive_category,
        competitive_tier: userData.tier ?? standingUser.competitive_tier,
        competitive_rating: userData.rating ?? standingUser.competitive_rating,
        competitive_ranking: userData.ranking ?? standingUser.competitive_ranking,
        progression_points: userData.progression_points ?? standingUser.progression_points,
        season_id: userData.season_id ?? standingUser.season_id,
        league_id: userData.league_id ?? standingUser.league_id,
      }
    : userData;

  return buildCanonicalUserPayload(source, {
    id: standingUser?.id || userData.user_id || userData.id,
    name: standingUser?.name || userData.name,
    avatar: standingUser?.avatar || userData.avatar,
    stars: userData.progression_points ?? userData.stars,
    wins: userData.wins ?? standingUser?.wins,
    losses: userData.losses ?? standingUser?.losses,
    position: standingUser?.position || userData.position,
  }, source);
}

module.exports = {
  toPlainUser,
  buildCanonicalUserPayload,
  buildProfileUserPayload,
  buildLeaderboardEntry,
};
