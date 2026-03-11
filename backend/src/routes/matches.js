const express = require('express');
const { getDB } = require('../database');
const auth = require('../middleware/auth');
const { notifyCourtByWhatsApp, notifyAdminWhatsApp } = require('../services/notifications');

const router = express.Router();

function getMatchWithDetails(db, matchId) {
  const match = db.prepare(`
    SELECT m.*, s.date, s.time, s.duration, s.price,
           c.id as court_id, c.name as court_name, c.address as court_address,
           c.whatsapp as court_whatsapp,
           u.name as creator_name, u.elo as creator_elo, u.category as creator_category, u.avatar as creator_avatar
    FROM matches m
    JOIN slots s ON m.slot_id = s.id
    JOIN courts c ON s.court_id = c.id
    JOIN users u ON m.creator_id = u.id
    WHERE m.id = ?
  `).get(matchId);

  if (!match) return null;

  const players = db.prepare(`
    SELECT u.id, u.name, u.elo, u.category, u.position, u.avatar, mp.team, mp.joined_at
    FROM match_players mp
    JOIN users u ON mp.user_id = u.id
    WHERE mp.match_id = ?
    ORDER BY mp.joined_at
  `).all(matchId);

  return { ...match, players };
}

// GET /api/matches - listar partidos abiertos
router.get('/', auth, (req, res) => {
  const db = getDB();
  const { date, category, court_id } = req.query;

  let conditions = [`m.status = 'open'`, `s.date >= date('now')`];
  const params = [];

  if (date) { conditions.push('s.date = ?'); params.push(date); }
  if (court_id) { conditions.push('s.court_id = ?'); params.push(court_id); }

  const matches = db.prepare(`
    SELECT m.id, m.title, m.description, m.status, m.min_players, m.max_players, m.created_at,
           s.date, s.time, s.duration, s.price,
           c.id as court_id, c.name as court_name, c.address as court_address,
           u.name as creator_name, u.elo as creator_elo, u.category as creator_category, u.avatar as creator_avatar,
           (SELECT COUNT(*) FROM match_players mp WHERE mp.match_id = m.id) as player_count
    FROM matches m
    JOIN slots s ON m.slot_id = s.id
    JOIN courts c ON s.court_id = c.id
    JOIN users u ON m.creator_id = u.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY s.date, s.time
  `).all(...params);

  // Filter by category if needed (based on avg player elo)
  res.json({ matches });
});

// GET /api/matches/my - mis partidos
router.get('/my', auth, (req, res) => {
  const db = getDB();
  const matches = db.prepare(`
    SELECT m.id, m.title, m.status, m.created_at,
           s.date, s.time, s.duration, s.price,
           c.name as court_name, c.address as court_address,
           (SELECT COUNT(*) FROM match_players mp WHERE mp.match_id = m.id) as player_count
    FROM matches m
    JOIN slots s ON m.slot_id = s.id
    JOIN courts c ON s.court_id = c.id
    WHERE m.id IN (SELECT match_id FROM match_players WHERE user_id = ?)
       OR m.creator_id = ?
    ORDER BY s.date DESC, s.time DESC
  `).all(req.user.id, req.user.id);

  res.json({ matches });
});

// GET /api/matches/:id
router.get('/:id', auth, (req, res) => {
  const db = getDB();
  const match = getMatchWithDetails(db, req.params.id);
  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
  res.json({ match });
});

// POST /api/matches - crear partido
router.post('/', auth, (req, res) => {
  try {
    const { slot_id, title, description, min_players = 3, max_players = 4 } = req.body;

    if (!slot_id) return res.status(400).json({ error: 'Turno requerido' });

    const db = getDB();

    // Verificar slot disponible
    const slot = db.prepare('SELECT * FROM slots WHERE id = ? AND is_available = 1').get(slot_id);
    if (!slot) return res.status(400).json({ error: 'El turno no está disponible' });

    // Verificar que no haya partido completo en ese slot
    const existingFull = db.prepare(`
      SELECT m.id FROM matches m WHERE m.slot_id = ? AND m.status = 'reserved'
    `).get(slot_id);
    if (existingFull) return res.status(400).json({ error: 'Ese turno ya fue reservado' });

    const result = db.prepare(`
      INSERT INTO matches (creator_id, slot_id, title, description, min_players, max_players)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, slot_id, title, description, min_players, max_players);

    const matchId = result.lastInsertRowid;

    // Creador se une automáticamente
    db.prepare('INSERT INTO match_players (match_id, user_id) VALUES (?, ?)').run(matchId, req.user.id);

    const match = getMatchWithDetails(db, matchId);
    res.status(201).json({ match });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando partido' });
  }
});

// POST /api/matches/:id/join - unirse a partido
router.post('/:id/join', auth, async (req, res) => {
  try {
    const db = getDB();
    const match = db.prepare(`
      SELECT m.*, s.date, s.time, s.duration, s.price, s.court_id,
             c.name as court_name, c.whatsapp as court_whatsapp,
             c.address as court_address
      FROM matches m
      JOIN slots s ON m.slot_id = s.id
      JOIN courts c ON s.court_id = c.id
      WHERE m.id = ?
    `).get(req.params.id);

    if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
    if (match.status !== 'open') return res.status(400).json({ error: 'El partido no está disponible' });

    const existing = db.prepare('SELECT id FROM match_players WHERE match_id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (existing) return res.status(400).json({ error: 'Ya estás en este partido' });

    const playerCount = db.prepare('SELECT COUNT(*) as c FROM match_players WHERE match_id = ?').get(req.params.id).c;
    if (playerCount >= match.max_players) return res.status(400).json({ error: 'El partido está completo' });

    db.prepare('INSERT INTO match_players (match_id, user_id) VALUES (?, ?)').run(req.params.id, req.user.id);

    const newCount = playerCount + 1;

    // Si alcanza el mínimo → reservar turno y notificar
    if (newCount >= match.min_players) {
      db.prepare(`UPDATE matches SET status = 'reserved' WHERE id = ?`).run(req.params.id);
      db.prepare(`UPDATE slots SET is_available = 0 WHERE id = ?`).run(match.slot_id);

      // Obtener todos los jugadores para la notificación
      const players = db.prepare(`
        SELECT u.name, u.category FROM match_players mp
        JOIN users u ON mp.user_id = u.id
        WHERE mp.match_id = ?
      `).all(req.params.id);

      const courtInfo = { name: match.court_name, whatsapp: match.court_whatsapp, address: match.court_address };
      const slotInfo = { date: match.date, time: match.time, duration: match.duration, price: match.price };

      // Notificar a la cancha y al admin
      notifyCourtByWhatsApp(match, slotInfo, courtInfo, players).catch(console.error);
      notifyAdminWhatsApp(match, slotInfo, courtInfo, players).catch(console.error);
    }

    const updatedMatch = getMatchWithDetails(db, req.params.id);
    res.json({ match: updatedMatch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error uniéndose al partido' });
  }
});

// DELETE /api/matches/:id/leave - salir del partido
router.delete('/:id/leave', auth, (req, res) => {
  const db = getDB();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
  if (match.status === 'completed') return res.status(400).json({ error: 'El partido ya finalizó' });

  db.prepare('DELETE FROM match_players WHERE match_id = ? AND user_id = ?').run(req.params.id, req.user.id);

  const remaining = db.prepare('SELECT COUNT(*) as c FROM match_players WHERE match_id = ?').get(req.params.id).c;

  if (remaining === 0) {
    db.prepare(`UPDATE matches SET status = 'cancelled' WHERE id = ?`).run(req.params.id);
    db.prepare(`UPDATE slots SET is_available = 1 WHERE id = ?`).run(match.slot_id);
  } else if (match.status === 'reserved') {
    db.prepare(`UPDATE matches SET status = 'open' WHERE id = ?`).run(req.params.id);
    db.prepare(`UPDATE slots SET is_available = 1 WHERE id = ?`).run(match.slot_id);
  }

  res.json({ success: true });
});

// PUT /api/matches/:id/complete - marcar como completado
router.put('/:id/complete', auth, (req, res) => {
  const db = getDB();
  const match = db.prepare('SELECT * FROM matches WHERE id = ? AND creator_id = ?').get(req.params.id, req.user.id);
  if (!match) return res.status(403).json({ error: 'Solo el creador puede finalizar el partido' });

  db.prepare(`UPDATE matches SET status = 'completed' WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
