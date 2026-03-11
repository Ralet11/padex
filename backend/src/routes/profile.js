const express = require('express');
const path = require('path');
const multer = require('multer');
const { getDB } = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/profile/:id
router.get('/:id', auth, (req, res) => {
  const db = getDB();
  const user = db.prepare(`
    SELECT id, name, email, elo, category, self_category, position, paddle_brand,
           preferred_partner, bio, wins, losses, avatar, favorite_court_id, created_at
    FROM users WHERE id = ?
  `).get(req.params.id);

  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  // Average rating
  const ratingData = db.prepare(`
    SELECT AVG(score) as avg_score, COUNT(*) as total_ratings
    FROM ratings WHERE rated_id = ?
  `).get(req.params.id);

  // Connection status with requester
  const connection = db.prepare(`
    SELECT id, status, requester_id FROM connections
    WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
  `).get(req.user.id, req.params.id, req.params.id, req.user.id);

  res.json({
    user: {
      ...user,
      avg_rating: ratingData.avg_score ? Math.round(ratingData.avg_score * 10) / 10 : null,
      total_ratings: ratingData.total_ratings,
    },
    connection: connection || null,
  });
});

// PUT /api/profile
router.put('/', auth, (req, res) => {
  const { name, position, paddle_brand, favorite_court_id, preferred_partner, bio } = req.body;
  const db = getDB();

  db.prepare(`
    UPDATE users SET
      name = COALESCE(?, name),
      position = COALESCE(?, position),
      paddle_brand = COALESCE(?, paddle_brand),
      favorite_court_id = COALESCE(?, favorite_court_id),
      preferred_partner = COALESCE(?, preferred_partner),
      bio = COALESCE(?, bio)
    WHERE id = ?
  `).run(name, position, paddle_brand, favorite_court_id, preferred_partner, bio, req.user.id);

  const user = db.prepare(`
    SELECT id, name, email, elo, category, position, paddle_brand, preferred_partner, bio, wins, losses, avatar, favorite_court_id
    FROM users WHERE id = ?
  `).get(req.user.id);

  res.json({ user });
});

// POST /api/profile/avatar
router.post('/avatar', auth, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se envió ninguna imagen' });

  const avatarUrl = `/uploads/${req.file.filename}`;
  const db = getDB();
  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatarUrl, req.user.id);

  res.json({ avatar: avatarUrl });
});

module.exports = router;
