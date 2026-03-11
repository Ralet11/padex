// Servicio de notificaciones - WhatsApp y consola
// Para habilitar WhatsApp real, completar credenciales en .env

function buildWhatsAppMessage(match, slot, court, players) {
  const playerList = players.map(p => `• ${p.name} (${p.category})`).join('\n');
  return (
    `🎾 *NUEVA RESERVA - ${court.name}*\n\n` +
    `📅 Fecha: ${slot.date}\n` +
    `⏰ Hora: ${slot.time} (${slot.duration} min)\n` +
    `💰 Precio: $${slot.price} por persona\n\n` +
    `👥 *Jugadores (${players.length}/${match.max_players}):*\n${playerList}\n\n` +
    `📝 Partido: ${match.title || 'Sin título'}\n\n` +
    `Por favor confirmar disponibilidad.`
  );
}

async function notifyCourtByWhatsApp(match, slot, court, players) {
  const message = buildWhatsAppMessage(match, slot, court, players);

  // Log siempre en consola para referencia
  console.log('\n📱 === NOTIFICACIÓN WHATSAPP PARA CANCHA ===');
  console.log(`Para: ${court.whatsapp || court.phone}`);
  console.log(message);
  console.log('==========================================\n');

  // Integración Twilio (habilitar si se configuran las credenciales)
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: `whatsapp:${court.whatsapp || court.phone}`,
        body: message,
      });
      console.log('✅ WhatsApp enviado via Twilio');
    } catch (err) {
      console.error('❌ Error enviando WhatsApp:', err.message);
    }
  }

  return message;
}

async function notifyAdminWhatsApp(match, slot, court, players) {
  const adminNumber = process.env.ADMIN_WHATSAPP;
  if (!adminNumber) return;

  const message = buildWhatsAppMessage(match, slot, court, players);
  console.log(`📱 Notificación admin (${adminNumber}):\n${message}`);
}

module.exports = { notifyCourtByWhatsApp, notifyAdminWhatsApp, buildWhatsAppMessage };
