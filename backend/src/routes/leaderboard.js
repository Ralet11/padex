const express = require('express');
const { User } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/leaderboard/:category_tier - Obtener el ranking de una liga específica
router.get('/:category_tier', auth, async (req, res) => {
    try {
        const { category_tier } = req.params;

        // Valiudate tier between 1 and 7
        if (!category_tier || isNaN(category_tier) || category_tier < 1 || category_tier > 7) {
            return res.status(400).json({ error: 'Categoría de liga inválida (Debe ser un valor 1-7)' });
        }

        // Only select players that have finished their 5 calibration matches
        const leaderboard = await User.findAll({
            where: {
                category_tier: parseInt(category_tier),
                // matches_played: { [Op.gte]: 5 } // Uncomment to enforce full calibration rules
            },
            attributes: ['id', 'name', 'avatar', 'stars', 'wins', 'losses', 'position'],
            order: [['stars', 'DESC']], // Highest stars first
            limit: 50 // Top 50 of that tier
        });

        res.json({ leaderboard });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor al cargar el ranking' });
    }
});

module.exports = router;
