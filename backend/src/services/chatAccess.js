// Shared by room subscriptions and typing; no database connection on import.
async function findAcceptedConnection(Connection, connectionId, userId) {
  if (!['number', 'string'].includes(typeof connectionId) || !['number', 'string'].includes(typeof userId)) return null;
  const id = Number(connectionId);
  const memberId = Number(userId);
  if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(memberId) || memberId <= 0) return null;
  const connection = await Connection.findOne({ where: { id, status: 'accepted' } });
  if (!connection || ![Number(connection.requester_id), Number(connection.addressee_id)].includes(memberId)) return null;
  return connection;
}

function registerChatSubscriptions(socket, Connection, logger = console) {
  socket.on('join_connection', async (connectionId, acknowledge) => {
    try {
      const connection = await findAcceptedConnection(Connection, connectionId, socket.user.id);
      if (!connection) {
        if (typeof acknowledge === 'function') acknowledge({ ok: false });
        return;
      }
      await socket.join(`conn_${connection.id}`);
      if (typeof acknowledge === 'function') acknowledge({ ok: true });
    } catch (error) {
      logger.error('[socket] Could not authorize chat subscription');
      if (typeof acknowledge === 'function') acknowledge({ ok: false });
    }
  });
  socket.on('typing', async (payload = {}) => {
    try {
      const connection = await findAcceptedConnection(Connection, payload?.connection_id, socket.user.id);
      if (connection) socket.to(`conn_${connection.id}`).emit('user_typing', { user_id: socket.user.id });
    } catch (error) {
      logger.error('[socket] Could not authorize typing event');
    }
  });
}
module.exports = { findAcceptedConnection, registerChatSubscriptions };
