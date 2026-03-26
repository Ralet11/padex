const express = require('express');
const { Op } = require('sequelize');
const { User, Connection, Rating, Message, sequelize } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/social/players - buscar jugadores
router.get('/players', auth, async (req, res) => {
  try {
    const { q, category, position } = req.query;

    const whereParams = {
      id: { [Op.ne]: req.user.id }
    };

    if (q) {
      whereParams[Op.or] = [
        { name: { [Op.iLike]: `%${q}%` } },
        { email: { [Op.iLike]: `%${q}%` } }
      ];
    }

    if (category) {
      // NOTE: `category` from the frontend might be "7ma" or an ID depending on how the frontend handles it now.
      whereParams.category_tier = category;
    }

    if (position) {
      whereParams.position = position;
    }

    // Since sorting and filtering by complex joined columns is hard in pure Sequelize
    // without raw queries, we can pull the users, their connections and ratings, and map them

    const playersRaw = await User.findAll({
      where: whereParams,
      attributes: ['id', 'name', 'stars', 'category_tier', 'position', 'paddle_brand', 'avatar', 'wins', 'losses'],
      limit: 50,
      order: [['stars', 'DESC']]
    });

    // Populate Connections and Ratings manually for the 50 items to keep it clean avoiding pure RAW SQL issues across dialects
    const playersPromises = playersRaw.map(async (u) => {
      const player = u.toJSON();

      // Find average rating
      const rating = await Rating.findOne({
        where: { rated_id: player.id },
        attributes: [[sequelize.fn('AVG', sequelize.col('score')), 'avg_score']],
        raw: true
      });
      player.avg_rating = rating.avg_score ? Math.round(rating.avg_score * 10) / 10 : 0;

      // Find Connection
      const connection = await Connection.findOne({
        where: {
          [Op.or]: [
            { requester_id: req.user.id, addressee_id: player.id },
            { addressee_id: req.user.id, requester_id: player.id }
          ]
        }
      });

      if (connection) {
        player.connection_id = connection.id;
        player.connection_status = connection.status;
        player.requester_id = connection.requester_id;
      } else {
        player.connection_id = null;
        player.connection_status = null;
        player.requester_id = null;
      }

      return player;
    });

    const players = await Promise.all(playersPromises);

    res.json({ players });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/social/connect - enviar solicitud de conexión
router.post('/connect', auth, async (req, res) => {
  try {
    const { addressee_id } = req.body;
    if (!addressee_id) return res.status(400).json({ error: 'ID de usuario requerido' });
    if (addressee_id == req.user.id) return res.status(400).json({ error: 'No puedes conectarte contigo mismo' });

    const target = await User.findByPk(addressee_id);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

    const existing = await Connection.findOne({
      where: {
        [Op.or]: [
          { requester_id: req.user.id, addressee_id },
          { requester_id: addressee_id, addressee_id: req.user.id }
        ]
      }
    });

    if (existing) {
      if (existing.status === 'accepted') return res.status(400).json({ error: 'Ya son compañeros' });
      if (existing.status === 'pending') return res.status(400).json({ error: 'Solicitud ya enviada' });
    }

    const connection = await Connection.create({
      requester_id: req.user.id,
      addressee_id,
      status: 'pending'
    });

    res.status(201).json({ connection });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/social/connect/:id - aceptar o rechazar
router.put('/connect/:id', auth, async (req, res) => {
  try {
    const { action } = req.body; // 'accept' | 'reject'
    if (!['accept', 'reject'].includes(action)) return res.status(400).json({ error: 'Acción inválida' });

    const connection = await Connection.findOne({
      where: { id: req.params.id, addressee_id: req.user.id }
    });

    if (!connection) return res.status(404).json({ error: 'Solicitud no encontrada' });
    if (connection.status !== 'pending') return res.status(400).json({ error: 'Solicitud ya procesada' });

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    await connection.update({ status: newStatus });

    res.json({ success: true, status: newStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/social/connect/:id - eliminar conexión
router.delete('/connect/:id', auth, async (req, res) => {
  try {
    const connection = await Connection.findOne({
      where: {
        id: req.params.id,
        [Op.or]: [
          { requester_id: req.user.id },
          { addressee_id: req.user.id }
        ]
      }
    });

    if (!connection) return res.status(404).json({ error: 'Conexión no encontrada' });

    await connection.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/social/connections - mis conexiones aceptadas
router.get('/connections', auth, async (req, res) => {
  try {
    const userConnections = await Connection.findAll({
      where: {
        [Op.or]: [
          { requester_id: req.user.id },
          { addressee_id: req.user.id }
        ],
        status: 'accepted'
      },
      order: [['createdAt', 'DESC']]
    });

    const connectionsPromises = userConnections.map(async (c) => {
      const connData = c.toJSON();

      const partnerId = connData.requester_id === req.user.id ? connData.addressee_id : connData.requester_id;
      const partner = await User.findByPk(partnerId, {
        attributes: ['name', 'avatar', 'stars', 'category_tier', 'position']
      });

      const lastMessage = await Message.findOne({
        where: { connection_id: c.id },
        order: [['createdAt', 'DESC']]
      });

      const unreadCount = await Message.count({
        where: {
          connection_id: c.id,
          sender_id: { [Op.ne]: req.user.id },
          read_at: null
        }
      });

      return {
        id: connData.id,
        status: connData.status,
        created_at: connData.createdAt,
        partner_id: partnerId,
        partner_name: partner?.name,
        partner_avatar: partner?.avatar,
        partner_stars: partner?.stars,
        partner_category: partner?.category_tier,
        partner_position: partner?.position,
        last_message: lastMessage?.content || null,
        last_message_at: lastMessage?.createdAt || null,
        unread_count: unreadCount
      };
    });

    const unsortedConnections = await Promise.all(connectionsPromises);

    // Sort by most recent message, or connection creation date
    unsortedConnections.sort((a, b) => {
      const dateA = a.last_message_at || a.created_at;
      const dateB = b.last_message_at || b.created_at;
      return new Date(dateB) - new Date(dateA);
    });

    res.json({ connections: unsortedConnections });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/social/pending - solicitudes pendientes
router.get('/pending', auth, async (req, res) => {
  try {
    const pendingConnections = await Connection.findAll({
      where: {
        addressee_id: req.user.id,
        status: 'pending'
      },
      include: [{
        model: User,
        as: 'Requester',
        attributes: ['id', 'name', 'avatar', 'stars', 'category_tier']
      }],
      order: [['createdAt', 'DESC']]
    });

    const pending = pendingConnections.map(c => {
      const connData = c.toJSON();
      return {
        id: connData.id,
        created_at: connData.createdAt,
        requester_id: connData.Requester.id,
        name: connData.Requester.name,
        avatar: connData.Requester.avatar,
        stars: connData.Requester.stars,
        category: connData.Requester.category_tier
      };
    });

    res.json({ pending });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
