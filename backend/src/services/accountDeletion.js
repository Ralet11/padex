const { randomUUID } = require('crypto');
const { Op } = require('sequelize');
const { MATCH_STATES } = require('../constants/matchStates');
const {
  sequelize,
  User,
  Match,
  MatchPlayer,
  MatchPayment,
  Connection,
  Message,
  Notification,
  Rating,
  ReputationProfile,
  ReputationRating,
  CalibrationVote,
  CompetitiveStanding,
} = require('../models');

class AccountDeletionError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code || 'account_deletion_error';
  }
}

async function countActiveMatchesForUser(userId, transaction) {
  const activeMatchState = {
    [Op.notIn]: [MATCH_STATES.COMPLETED, MATCH_STATES.CANCELLED],
  };

  const [activeParticipations, activeCreatedMatches] = await Promise.all([
    MatchPlayer.count({
      where: { user_id: userId },
      include: [{ model: Match, required: true, where: { state: activeMatchState } }],
      transaction,
    }),
    Match.count({
      where: { creator_id: userId, state: activeMatchState },
      transaction,
    }),
  ]);

  return activeParticipations + activeCreatedMatches;
}

async function deleteAccountForUser({ userId, requestId }) {
  return sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(userId, { transaction });

    if (!user) {
      throw new AccountDeletionError(404, 'Usuario no encontrado', 'user_not_found');
    }

    if (user.deleted_at) {
      throw new AccountDeletionError(410, 'La cuenta ya fue eliminada', 'account_already_deleted');
    }

    if (user.role !== 'player') {
      throw new AccountDeletionError(
        403,
        'Esta cuenta debe eliminarse manualmente con soporte',
        'account_requires_manual_support'
      );
    }

    const activeMatches = await countActiveMatchesForUser(user.id, transaction);
    if (activeMatches > 0) {
      throw new AccountDeletionError(
        409,
        'Debes salir de tus partidos activos antes de eliminar la cuenta',
        'account_has_active_matches'
      );
    }

    const connections = await Connection.findAll({
      where: {
        [Op.or]: [{ requester_id: user.id }, { addressee_id: user.id }],
      },
      attributes: ['id'],
      transaction,
    });
    const connectionIds = connections.map((connection) => connection.id);

    if (connectionIds.length > 0) {
      await Message.destroy({
        where: { connection_id: connectionIds },
        transaction,
      });
    }

    await Promise.all([
      Connection.destroy({
        where: {
          [Op.or]: [{ requester_id: user.id }, { addressee_id: user.id }],
        },
        transaction,
      }),
      Notification.destroy({
        where: { user_id: user.id },
        transaction,
      }),
      MatchPayment.destroy({
        where: { user_id: user.id },
        transaction,
      }),
      Rating.destroy({
        where: {
          [Op.or]: [{ rater_id: user.id }, { rated_id: user.id }],
        },
        transaction,
      }),
      ReputationRating.destroy({
        where: {
          [Op.or]: [{ rater_id: user.id }, { rated_id: user.id }],
        },
        transaction,
      }),
      CalibrationVote.destroy({
        where: {
          [Op.or]: [{ voter_id: user.id }, { target_id: user.id }],
        },
        transaction,
      }),
      CompetitiveStanding.destroy({
        where: { user_id: user.id },
        transaction,
      }),
      ReputationProfile.destroy({
        where: { user_id: user.id },
        transaction,
      }),
    ]);

    const deletedAt = new Date();
    const anonymizedEmail = `deleted-user-${user.id}-${deletedAt.getTime()}@deleted.padex.local`;

    await user.update(
      {
        email: anonymizedEmail,
        google_sub: null,
        apple_sub: null,
        password: randomUUID(),
        name: 'Usuario eliminado',
        avatar: null,
        avatar_seed: null,
        position: null,
        paddle_brand: null,
        favorite_court_id: null,
        preferred_partner: null,
        bio: null,
        league_id: null,
        season_id: null,
        competitive_category: null,
        competitive_tier: null,
        competitive_rating: 0,
        competitive_ranking: null,
        progression_points: 0,
        category: 'principiante',
        self_category: null,
        role: 'player',
        deleted_at: deletedAt,
      },
      { transaction }
    );

    console.log(`[account.delete] [${requestId}] success`, {
      userId: user.id,
      deletedAt: deletedAt.toISOString(),
    });

    return { deletedAt };
  });
}

module.exports = {
  AccountDeletionError,
  deleteAccountForUser,
};
