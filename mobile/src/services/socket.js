import { io } from 'socket.io-client';
import { BASE_URL } from './api';

let socket = null;

export function initSocket(token) {
  if (socket) socket.disconnect();

  socket = io(BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => console.log('🔌 Socket conectado'));
  socket.on('disconnect', () => console.log('🔌 Socket desconectado'));
  socket.on('connect_error', (err) => console.log('🔌 Error socket:', err.message));

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinConnectionRoom(connectionId) {
  if (socket) socket.emit('join_connection', connectionId);
}

export function sendSocketMessage(connectionId, content) {
  if (socket) socket.emit('send_message', { connection_id: connectionId, content });
}

export function emitTyping(connectionId) {
  if (socket) socket.emit('typing', { connection_id: connectionId });
}

export function joinVenueAvailability(venueId, date) {
  if (socket && venueId) {
    socket.emit('join_venue_availability', { venue_id: venueId, date });
  }
}

export function leaveVenueAvailability(venueId, date) {
  if (socket && venueId) {
    socket.emit('leave_venue_availability', { venue_id: venueId, date });
  }
}
