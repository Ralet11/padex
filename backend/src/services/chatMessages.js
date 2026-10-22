const { findAcceptedConnection } = require('./chatAccess');

function registerChatMessages(socket, { Connection, Message, User, io, userSockets }, logger = console) {
  socket.on('send_message', async (payload = {}, acknowledge) => {
    const reply = result => { if (typeof acknowledge === 'function') acknowledge(result); };
    if (typeof payload?.content !== 'string' || !payload.content.trim()) {
      reply({ ok: false });
      return;
    }
    try {
      const userId = Number(socket.user.id);
      const connection = await findAcceptedConnection(Connection, payload.connection_id, userId);
      if (!connection) { reply({ ok: false }); return; }
      const message = await Message.create({
        connection_id: connection.id,
        sender_id: userId,
        content: payload.content.trim(),
      });
      const withSender = await Message.findOne({
        where: { id: message.id },
        include: [{ model: User, as: 'Sender', attributes: ['name', 'avatar', 'avatar_seed'] }],
      });
      if (!withSender) { reply({ ok: false }); return; }
      io.to(`conn_${connection.id}`).emit('new_message', withSender);
      const partnerId = Number(connection.requester_id) === userId ? Number(connection.addressee_id) : Number(connection.requester_id);
      const partnerSocket = userSockets.get(partnerId);
      if (partnerSocket) io.to(partnerSocket).emit('message_notification', { connection_id: connection.id, message: withSender });
      reply({ ok: true });
    } catch (error) {
      logger.error('[socket] Could not send chat message');
      reply({ ok: false });
    }
  });
}
module.exports = { registerChatMessages };
