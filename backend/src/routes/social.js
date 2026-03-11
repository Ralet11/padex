const express = require('express');
const { getDB } = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/social/players - buscar jugadores
router.get('/players', auth, (req, res) => {
  const db = getDB();
  const { q, category, position } = req.query;

  let conditions = ['u.id != ?'];
  const params = [req.user.id];

  if (q) {
    conditions.push('(u.name LIKE ? OR u.email LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (category) { conditions.push('u.category = ?'); params.push(category); }
  if (position) { conditions.push('u.position = ?'); params.push(position); }

  const players = db.prepare(`
    SELECT u.id, u.name, u.elo, u.category, u.position, u.paddle_brand, u.avatar, u.wins, u.losses,
           COALESCE(r.avg_score, 0) as avg_rating,
           c.id as connection_id, c.status as connection_status, c.requester_id
    FROM users u
    LEFT JOIN (SELECT rated_id, AVG(score) as avg_score FROM ratings GROUP BY rated_id) r ON r.rated_id = u.id
    LEFT JOIN connections c ON (
      (c.requester_id = ? AND c.addressee_id = u.id) OR
      (c.addressee_id = ? AND c.requester_id = u.id)
    )
    WHERE ${conditions.join(' AND ')}
    ORDER BY u.elo DESC
    LIMIT 50
  `).all(req.user.id, req.user.id, ...params);

  res.json({ players });
});

// POST /api/social/connect - enviar solicitud de conexión
router.post('/connect', auth, (req, res) => {
  const { addressee_id } = req.body;
  if (!addressee_id) return res.status(400).json({ error: 'ID de usuario requerido' });
  if (addressee_id == req.user.id) return res.status(400).json({ error: 'No puedes conectarte contigo mismo' });

  const db = getDB();
  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(addressee_id);
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

  const existing = db.prepare(`
    SELECT * FROM connections
    WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
  `).get(req.user.id, addressee_id, addressee_id, req.user.id);

  if (existing) {
    if (existing.status === 'accepted') return res.status(400).json({ error: 'Ya son compañeros' });
    if (existing.status === 'pending') return res.status(400).json({ error: 'Solicitud ya enviada' });
  }

  const result = db.prepare(
    'INSERT INTO connections (requester_id, addressee_id, status) VALUES (?, ?, ?)'
  ).run(req.user.id, addressee_id, 'pending');

  const connection = db.prepare('SELECT * FROM connections WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ connection });
});

// PUT /api/social/connect/:id - aceptar o rechazar
router.put('/connect/:id', auth, (req, res) => {
  const { action } = req.body; // 'accept' | 'reject'
  if (!['accept', 'reject'].includes(action)) return res.status(400).json({ error: 'Acción inválida' });

  const db = getDB();
  const connection = db.prepare('SELECT * FROM connections WHERE id = ? AND addressee_id = ?').get(req.params.id, req.user.id);
  if (!connection) return res.status(404).json({ error: 'Solicitud no encontrada' });
  if (connection.status !== 'pending') return res.status(400).json({ error: 'Solicitud ya procesada' });

  const newStatus = action === 'accept' ? 'accepted' : 'rejected';
  db.prepare('UPDATE connections SET status = ? WHERE id = ?').run(newStatus, req.params.id);

  res.json({ success: true, status: newStatus });
});

// DELETE /api/social/connect/:id - eliminar conexión
router.delete('/connect/:id', auth, (req, res) => {
  const db = getDB();
  const connection = db.prepare(
    'SELECT * FROM connections WHERE id = ? AND (requester_id = ? OR addressee_id = ?)'
  ).get(req.params.id, req.user.id, req.user.id);

  if (!connection) return res.status(404).json({ error: 'Conexión no encontrada' });

  db.prepare('DELETE FROM connections WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/social/connections - mis conexiones aceptadas
router.get('/connections', auth, (req, res) => {
  const db = getDB();
  const connections = db.prepare(`
    SELECT c.id, c.status, c.created_at,
           CASE WHEN c.requester_id = ? THEN c.addressee_id ELSE c.requester_id END as partner_id,
           u.name as partner_name, u.avatar as partner_avatar, u.elo as partner_elo,
           u.category as partner_category, u.position as partner_position,
           (SELECT content FROM messages WHERE connection_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
           (SELECT created_at FROM messages WHERE connection_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
           (SELECT COUNT(*) FROM messages WHERE connection_id = c.id AND sender_id != ? AND read_at IS NULL) as unread_count
    FROM connections c
    JOIN users u ON u.id = CASE WHEN c.requester_id = ? THEN c.addressee_id ELSE c.requester_id END
    WHERE (c.requester_id = ? OR c.addressee_id = ?) AND c.status = 'accepted'
    ORDER BY last_message_at DESC, c.created_at DESC
  `).all(req.user.id, req.user.id, req.user.id, req.user.id, req.user.id);

  res.json({ connections });
});

// GET /api/social/pending - solicitudes pendientes
router.get('/pending', auth, (req, res) => {
  const db = getDB();
  const pending = db.prepare(`
    SELECT c.id, c.created_at,
           u.id as requester_id, u.name, u.avatar, u.elo, u.category
    FROM connections c
    JOIN users u ON u.id = c.requester_id
    WHERE c.addressee_id = ? AND c.status = 'pending'
    ORDER BY c.created_at DESC
  `).all(req.user.id);

  res.json({ pending });
});

module.exports = router;
