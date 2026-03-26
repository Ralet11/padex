const express = require('express');
const { Op } = require('sequelize');
const { Message, Connection, User } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/messages/:connectionId - obtener mensajes
router.get('/:connectionId', auth, async (req, res) => {
  try {
    // Verificar que pertenece a la conexión
    const conn = await Connection.findOne({
      where: {
        id: req.params.connectionId,
        [Op.or]: [
          { requester_id: req.user.id },
          { addressee_id: req.user.id }
        ],
        status: 'accepted'
      }
    });

    if (!conn) return res.status(403).json({ error: 'Acceso denegado' });

    const messagesRaw = await Message.findAll({
      where: { connection_id: req.params.connectionId },
      include: [{
        model: User,
        as: 'Sender',
        attributes: ['name', 'avatar']
      }],
      order: [['createdAt', 'ASC']],
      limit: 100
    });

    const messages = messagesRaw.map(m => {
      const dbMsg = m.toJSON();
      return {
        id: dbMsg.id,
        sender_id: dbMsg.sender_id,
        content: dbMsg.content,
        read_at: dbMsg.read_at,
        created_at: dbMsg.createdAt,
        sender_name: dbMsg.Sender.name,
        sender_avatar: dbMsg.Sender.avatar
      };
    });

    // Marcar como leídos
    await Message.update(
      { read_at: new Date() },
      {
        where: {
          connection_id: req.params.connectionId,
          sender_id: { [Op.ne]: req.user.id },
          read_at: null
        }
      }
    );

    res.json({ messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor al obtener mensajes' });
  }
});

// POST /api/messages - enviar mensaje
router.post('/', auth, async (req, res) => {
  try {
    const { connection_id, content } = req.body;
    if (!connection_id || !content?.trim()) return res.status(400).json({ error: 'connection_id y content requeridos' });

    const conn = await Connection.findOne({
      where: {
        id: connection_id,
        [Op.or]: [
          { requester_id: req.user.id },
          { addressee_id: req.user.id }
        ],
        status: 'accepted'
      }
    });

    if (!conn) return res.status(403).json({ error: 'Acceso denegado' });

    const newMsg = await Message.create({
      connection_id,
      sender_id: req.user.id,
      content: content.trim()
    });

    const msgWithSender = await Message.findByPk(newMsg.id, {
      include: [{
        model: User,
        as: 'Sender',
        attributes: ['name', 'avatar']
      }]
    });

    const dbMsg = msgWithSender.toJSON();
    const formattedMsg = {
      id: dbMsg.id,
      sender_id: dbMsg.sender_id,
      content: dbMsg.content,
      read_at: dbMsg.read_at,
      created_at: dbMsg.createdAt,
      sender_name: dbMsg.Sender.name,
      sender_avatar: dbMsg.Sender.avatar
    };

    res.status(201).json({ message: formattedMsg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error agregando mensaje' });
  }
});

module.exports = router;
