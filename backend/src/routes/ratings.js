const express = require('express');
const { getDB } = require('../database');
const auth = require('../middleware/auth');
const { eloAdjustFromRating, categoryFromElo } = require('../services/elo');

const router = express.Router();

// POST /api/ratings - calificar a un jugador
router.post('/', auth, (req, res) => {
  const { rated_id, match_id, score, comment } = req.body;

  if (!rated_id || !score) return res.status(400).json({ error: 'rated_id y score requeridos' });
  if (score < 1 || score > 5) return res.status(400).json({ error: 'Score debe ser entre 1 y 5' });
  if (rated_id == req.user.id) return res.status(400).json({ error: 'No puedes calificarte a ti mismo' });

  const db = getDB();

  // Si viene match_id, verificar que ambos jugaron
  if (match_id) {
    const raterIn = db.prepare('SELECT id FROM match_players WHERE match_id = ? AND user_id = ?').get(match_id, req.user.id);
    const ratedIn = db.prepare('SELECT id FROM match_players WHERE match_id = ? AND user_id = ?').get(match_id, rated_id);
    if (!raterIn || !ratedIn) return res.status(400).json({ error: 'Ambos deben haber jugado ese partido' });
  }

  try {
    db.prepare(
      'INSERT INTO ratings (rater_id, rated_id, match_id, score, comment) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, rated_id, match_id || null, score, comment || null);

    // Ajustar ELO del calificado
    const eloAdj = eloAdjustFromRating(score);
    if (eloAdj !== 0) {
      const user = db.prepare('SELECT elo FROM users WHERE id = ?').get(rated_id);
      const newElo = Math.max(100, user.elo + eloAdj);
      const newCategory = categoryFromElo(newElo);
      db.prepare('UPDATE users SET elo = ?, category = ? WHERE id = ?').run(newElo, newCategory, rated_id);
    }

    res.status(201).json({ success: true });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Ya calificaste a este jugador en ese partido' });
    throw err;
  }
});

// GET /api/ratings/:userId - calificaciones de un usuario
router.get('/:userId', auth, (req, res) => {
  const db = getDB();
  const ratings = db.prepare(`
    SELECT r.id, r.score, r.comment, r.created_at,
           u.id as rater_id, u.name as rater_name, u.avatar as rater_avatar
    FROM ratings r
    JOIN users u ON r.rater_id = u.id
    WHERE r.rated_id = ?
    ORDER BY r.created_at DESC
    LIMIT 30
  `).all(req.params.userId);

  const summary = db.prepare(`
    SELECT AVG(score) as avg_score, COUNT(*) as total
    FROM ratings WHERE rated_id = ?
  `).get(req.params.userId);

  res.json({
    ratings,
    avg_score: summary.avg_score ? Math.round(summary.avg_score * 10) / 10 : 0,
    total: summary.total,
  });
});

module.exports = router;
