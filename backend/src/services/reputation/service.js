const { sequelize, Rating, ReputationProfile, ReputationRating, User } = require('../../models');

async function submitReputationRating({ raterId, ratedId, matchId = null, score, comment = null }) {
  return sequelize.transaction(async (transaction) => {
    const existing = await ReputationRating.findOne({
      where: {
        rater_id: raterId,
        rated_id: ratedId,
        match_id: matchId,
      },
      transaction,
    });

    if (existing) {
      const error = new Error('Ya calificaste a este jugador en ese partido');
      error.status = 400;
      throw error;
    }

    const [profile] = await ReputationProfile.findOrCreate({
      where: { user_id: ratedId },
      defaults: { user_id: ratedId },
      transaction,
    });

    const rating = await ReputationRating.create({
      profile_id: profile.id,
      rater_id: raterId,
      rated_id: ratedId,
      match_id: matchId,
      score,
      comment,
    }, { transaction });

    await Rating.findOrCreate({
      where: {
        rater_id: raterId,
        rated_id: ratedId,
        match_id: matchId,
      },
      defaults: {
        rater_id: raterId,
        rated_id: ratedId,
        match_id: matchId,
        score,
        comment,
      },
      transaction,
    });

    const summary = await ReputationRating.findOne({
      where: { rated_id: ratedId },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('score')), 'avg_score'],
        [sequelize.fn('COUNT', sequelize.col('*')), 'total'],
      ],
      raw: true,
      transaction,
    });

    const avgScore = summary?.avg_score ? Math.round(Number(summary.avg_score) * 10) / 10 : 0;
    const total = Number(summary?.total || 0);

    profile.avg_score = avgScore;
    profile.ratings_count = total;
    profile.last_rated_at = new Date();
    await profile.save({ transaction });

    await User.update({
      reputation_avg_score: avgScore,
      reputation_ratings_count: total,
    }, {
      where: { id: ratedId },
      transaction,
    });

    return { rating, avg_score: avgScore, total };
  });
}

module.exports = {
  submitReputationRating,
};
