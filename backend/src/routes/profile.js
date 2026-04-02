const express = require('express');
const path = require('path');
const multer = require('multer');
const { User, Rating, Connection, sequelize } = require('../models');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { buildCanonicalUserPayload, buildProfileUserPayload } = require('../services/competitive/userContracts');

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
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Average rating
    const ratingData = await Rating.findOne({
      where: { rated_id: req.params.id },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('score')), 'avg_score'],
        [sequelize.fn('COUNT', sequelize.col('*')), 'total_ratings']
      ],
      raw: true
    });

    // Connection status with requester
    const connection = await Connection.findOne({
      where: {
        [Op.or]: [
          { requester_id: req.user.id, addressee_id: req.params.id },
          { requester_id: req.params.id, addressee_id: req.user.id }
        ]
      }
    });

    res.json({
      user: buildProfileUserPayload(user, {
        avg_score: ratingData.avg_score ? Math.round(ratingData.avg_score * 10) / 10 : null,
        total_ratings: parseInt(ratingData.total_ratings || 0),
      }),
      connection: connection || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/profile
router.put('/', auth, async (req, res) => {
  try {
    const { name, position, paddle_brand, favorite_court_id, preferred_partner, bio } = req.body;

    // Filter undefined values
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (position !== undefined) updates.position = position;
    if (paddle_brand !== undefined) updates.paddle_brand = paddle_brand;
    if (favorite_court_id !== undefined) updates.favorite_court_id = favorite_court_id;
    if (preferred_partner !== undefined) updates.preferred_partner = preferred_partner;
    if (bio !== undefined) updates.bio = bio;

    await User.update(updates, { where: { id: req.user.id } });

    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    res.json({ user: buildCanonicalUserPayload(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/profile/avatar
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se envió ninguna imagen' });

    const avatarUrl = `/uploads/${req.file.filename}`;
    await User.update({ avatar: avatarUrl }, { where: { id: req.user.id } });

    res.json({ avatar: avatarUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
