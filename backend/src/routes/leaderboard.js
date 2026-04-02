const express = require('express');
const { literal } = require('sequelize');
const { User, CompetitiveStanding } = require('../models');
const auth = require('../middleware/auth');
const { buildLeaderboardEntry } = require('../services/competitive/userContracts');
const { getActiveSeasonForLeague } = require('../services/competitive/seasons');

const router = express.Router();

// GET /api/leaderboard/:category_tier - Obtener el ranking de una liga específica
router.get('/:category_tier', auth, async (req, res) => {
    try {
        const { category_tier } = req.params;

        // Valiudate tier between 1 and 7
        if (!category_tier || isNaN(category_tier) || category_tier < 1 || category_tier > 7) {
            return res.status(400).json({ error: 'Categoría de liga inválida (Debe ser un valor 1-7)' });
        }

        const leagueId = req.user?.competitive_context?.league_id || req.user?.league_id;
        const activeSeason = await getActiveSeasonForLeague(leagueId);

        if (!activeSeason) {
            return res.json({ leaderboard: [] });
        }

        const leaderboard = await CompetitiveStanding.findAll({
            where: {
                season_id: activeSeason.id,
                tier: parseInt(category_tier, 10),
            },
            include: [{
                model: User,
                as: 'User',
                attributes: [
                    'id',
                    'name',
                    'avatar',
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
                    'losses'
                ],
                required: true,
            }],
            order: [
                [literal('"CompetitiveStanding"."ranking" IS NULL'), 'ASC'],
                ['ranking', 'ASC'],
                ['progression_points', 'DESC'],
                ['rating', 'DESC'],
                ['id', 'ASC']
            ],
            limit: 50 // Top 50 of that tier
        });

        res.json({ leaderboard: leaderboard.map(buildLeaderboardEntry) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor al cargar el ranking' });
    }
});

module.exports = router;
