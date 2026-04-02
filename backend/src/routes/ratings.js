const express = require('express');
const { Rating, User, MatchPlayer, ReputationRating, sequelize } = require('../models');
const auth = require('../middleware/auth');
const { submitReputationRating } = require('../services/reputation/service');

const router = express.Router();

// POST /api/ratings - calificar a un jugador
router.post('/', auth, async (req, res) => {
  try {
    const { rated_id, match_id, score, comment } = req.body;

    if (!rated_id || !score) return res.status(400).json({ error: 'rated_id y score requeridos' });
    if (score < 1 || score > 5) return res.status(400).json({ error: 'Score debe ser entre 1 y 5' });
    if (rated_id == req.user.id) return res.status(400).json({ error: 'No puedes calificarte a ti mismo' });

    if (match_id) {
      const raterIn = await MatchPlayer.findOne({ where: { match_id, user_id: req.user.id } });
      const ratedIn = await MatchPlayer.findOne({ where: { match_id, user_id: rated_id } });
      if (!raterIn || !ratedIn) return res.status(400).json({ error: 'Ambos deben haber jugado ese partido' });
    }

    const result = await submitReputationRating({
      raterId: req.user.id,
      ratedId: rated_id,
      matchId: match_id || null,
      score,
      comment: comment || null,
    });

    res.status(201).json({ success: true, avg_score: result.avg_score, total: result.total });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Ya calificaste a este jugador en ese partido' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error agregando calificación' });
  }
});

// GET /api/ratings/:userId - calificaciones de un usuario
router.get('/:userId', auth, async (req, res) => {
  try {
    const ratingsRaw = await ReputationRating.findAll({
      where: { rated_id: req.params.userId },
      include: [{
        model: User,
        as: 'Rater',
        attributes: ['id', 'name', 'avatar']
      }],
      order: [['createdAt', 'DESC']],
      limit: 30
    });

    const ratings = ratingsRaw.map(r => {
      const dbRating = r.toJSON();
      return {
        id: dbRating.id,
        score: dbRating.score,
        comment: dbRating.comment,
        created_at: dbRating.createdAt,
        rater_id: dbRating.Rater.id,
        rater_name: dbRating.Rater.name,
        rater_avatar: dbRating.Rater.avatar
      };
    });

    const summary = await ReputationRating.findOne({
      where: { rated_id: req.params.userId },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('score')), 'avg_score'],
        [sequelize.fn('COUNT', sequelize.col('*')), 'total']
      ],
      raw: true
    });

    if (ratings.length === 0) {
      const legacyRatingsRaw = await Rating.findAll({
        where: { rated_id: req.params.userId },
        include: [{
          model: User,
          as: 'Rater',
          attributes: ['id', 'name', 'avatar']
        }],
        order: [['createdAt', 'DESC']],
        limit: 30
      });

      const legacyRatings = legacyRatingsRaw.map((rating) => {
        const dbRating = rating.toJSON();
        return {
          id: dbRating.id,
          score: dbRating.score,
          comment: dbRating.comment,
          created_at: dbRating.createdAt,
          rater_id: dbRating.Rater.id,
          rater_name: dbRating.Rater.name,
          rater_avatar: dbRating.Rater.avatar
        };
      });

      const legacySummary = await Rating.findOne({
        where: { rated_id: req.params.userId },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('score')), 'avg_score'],
          [sequelize.fn('COUNT', sequelize.col('*')), 'total']
        ],
        raw: true
      });

      return res.json({
        ratings: legacyRatings,
        avg_score: legacySummary?.avg_score ? Math.round(legacySummary.avg_score * 10) / 10 : 0,
        total: parseInt(legacySummary?.total || 0),
      });
    }

    res.json({
      ratings,
      avg_score: summary?.avg_score ? Math.round(summary.avg_score * 10) / 10 : 0,
      total: parseInt(summary?.total || 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor al obtener calificaciones' });
  }
});

module.exports = router;
