const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../database');
const { eloFromSelfCategory, categoryFromElo } = require('../services/elo');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, self_category = 'principiante' } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, contraseña y nombre son requeridos' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const db = getDB();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) return res.status(409).json({ error: 'El email ya está registrado' });

    const hashed = await bcrypt.hash(password, 10);
    const elo = eloFromSelfCategory(self_category);
    const category = categoryFromElo(elo);

    const result = db.prepare(`
      INSERT INTO users (email, password, name, self_category, elo, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(email.toLowerCase(), hashed, name, self_category, elo, category);

    const user = db.prepare('SELECT id, email, name, elo, category, self_category, position, paddle_brand, bio, wins, losses, avatar, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });

    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  const db = getDB();
  const user = db.prepare('SELECT id, email, name, elo, category, self_category, position, paddle_brand, preferred_partner, bio, wins, losses, avatar, favorite_court_id, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ user });
});

module.exports = router;
