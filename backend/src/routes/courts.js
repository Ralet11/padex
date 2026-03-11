const express = require('express');
const { getDB } = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/courts
router.get('/', auth, (req, res) => {
  const db = getDB();
  const courts = db.prepare('SELECT * FROM courts ORDER BY name').all();
  res.json({ courts });
});

// GET /api/courts/:id
router.get('/:id', auth, (req, res) => {
  const db = getDB();
  const court = db.prepare('SELECT * FROM courts WHERE id = ?').get(req.params.id);
  if (!court) return res.status(404).json({ error: 'Cancha no encontrada' });
  res.json({ court });
});

// GET /api/courts/:id/slots  - turnos disponibles
router.get('/:id/slots', auth, (req, res) => {
  const db = getDB();
  const { date } = req.query;

  let query = `
    SELECT s.*,
      (SELECT COUNT(*) FROM matches m
       JOIN match_players mp ON m.id = mp.match_id
       WHERE m.slot_id = s.id AND m.status IN ('open','reserved')) as players_count,
      (SELECT COUNT(*) FROM matches m WHERE m.slot_id = s.id AND m.status IN ('open','reserved')) as has_match
    FROM slots s
    WHERE s.court_id = ? AND s.is_available = 1
  `;
  const params = [req.params.id];

  if (date) {
    query += ' AND s.date = ?';
    params.push(date);
  } else {
    query += ` AND s.date >= date('now')`;
  }

  query += ' ORDER BY s.date, s.time';

  const slots = db.prepare(query).all(...params);
  res.json({ slots });
});

module.exports = router;
