const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { starsFromSelfCategory, categoryFromStars } = require('../services/elo');
const auth = require('../middleware/auth');
const { buildCanonicalUserPayload } = require('../services/competitive/userContracts');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const {
      email,
      password,
      confirmPassword,
      name,
      self_category = 'principiante',
      paddle_brand,
      position
    } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    console.log(`[auth.register] [${req.requestId}] attempt`, {
      email: normalizedEmail || null,
      hasName: Boolean(name?.trim()),
      hasPassword: Boolean(password),
      hasConfirmPassword: typeof confirmPassword === 'string',
      selfCategory: self_category,
      position,
    });

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, contrasena y nombre son requeridos' });
    }

    if (typeof confirmPassword === 'string' && password !== confirmPassword) {
      console.warn(`[auth.register] [${req.requestId}] password confirmation mismatch`, {
        email: normalizedEmail || null,
      });
      return res.status(400).json({ error: 'Las contrasenas no coinciden' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres' });
    }

    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      console.warn(`[auth.register] [${req.requestId}] email already registered`, {
        email: normalizedEmail,
      });
      return res.status(409).json({ error: 'El email ya esta registrado' });
    }

    const stars = starsFromSelfCategory(self_category);
    const category_tier = categoryFromStars(stars);

    const user = await User.create({
      email: normalizedEmail,
      password,
      name,
      self_category,
      category_tier,
      stars,
      paddle_brand,
      position
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log(`[auth.register] [${req.requestId}] user created`, {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({ token, user: buildCanonicalUserPayload(user) });
  } catch (err) {
    console.error(`[auth.register] [${req.requestId}] error`);
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    console.log(`[auth.login] [${req.requestId}] attempt`, {
      email: normalizedEmail || null,
      hasPassword: Boolean(password),
    });

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contrasena requeridos' });
    }

    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      console.warn(`[auth.login] [${req.requestId}] user not found`, {
        email: normalizedEmail || null,
      });
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.warn(`[auth.login] [${req.requestId}] invalid password`, {
        email: normalizedEmail,
        userId: user.id,
      });
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log(`[auth.login] [${req.requestId}] login success`, {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({ token, user: buildCanonicalUserPayload(user) });
  } catch (err) {
    console.error(`[auth.login] [${req.requestId}] error`);
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user: buildCanonicalUserPayload(user) });
  } catch (err) {
    console.error(`[auth.me] [${req.requestId}] error`);
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
