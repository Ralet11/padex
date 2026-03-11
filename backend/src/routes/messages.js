const express = require('express');
const { getDB } = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/messages/:connectionId - obtener mensajes
router.get('/:connectionId', auth, (req, res) => {
  const db = getDB();

  // Verificar que pertenece a la conexión
  const conn = db.prepare(
    'SELECT * FROM connections WHERE id = ? AND (requester_id = ? OR addressee_id = ?) AND status = ?'
  ).get(req.params.connectionId, req.user.id, req.user.id, 'accepted');

  if (!conn) return res.status(403).json({ error: 'Acceso denegado' });

  const messages = db.prepare(`
    SELECT m.id, m.sender_id, m.content, m.read_at, m.created_at,
           u.name as sender_name, u.avatar as sender_avatar
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.connection_id = ?
    ORDER BY m.created_at ASC
    LIMIT 100
  `).all(req.params.connectionId);

  // Marcar como leídos
  db.prepare(`
    UPDATE messages SET read_at = CURRENT_TIMESTAMP
    WHERE connection_id = ? AND sender_id != ? AND read_at IS NULL
  `).run(req.params.connectionId, req.user.id);

  res.json({ messages });
});

// POST /api/messages - enviar mensaje
router.post('/', auth, (req, res) => {
  const { connection_id, content } = req.body;
  if (!connection_id || !content?.trim()) return res.status(400).json({ error: 'connection_id y content requeridos' });

  const db = getDB();

  const conn = db.prepare(
    'SELECT * FROM connections WHERE id = ? AND (requester_id = ? OR addressee_id = ?) AND status = ?'
  ).get(connection_id, req.user.id, req.user.id, 'accepted');

  if (!conn) return res.status(403).json({ error: 'Acceso denegado' });

  const result = db.prepare(
    'INSERT INTO messages (connection_id, sender_id, content) VALUES (?, ?, ?)'
  ).run(connection_id, req.user.id, content.trim());

  const message = db.prepare(`
    SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
    FROM messages m JOIN users u ON m.sender_id = u.id
    WHERE m.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ message });
});

module.exports = router;
