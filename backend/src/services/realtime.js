let ioInstance = null;

function setIO(io) {
  ioInstance = io;
}

function getVenueRoom(venueId) {
  return `venue_${venueId}`;
}

function getVenueDateRoom(venueId, date) {
  return `venue_${venueId}_date_${date}`;
}

function emitVenueAvailabilityUpdate({ venueId, date, reason = 'availability_changed' }) {
  if (!ioInstance || !venueId) return;

  const payload = {
    venue_id: Number(venueId),
    date: date || null,
    reason,
    emitted_at: new Date().toISOString(),
  };

  ioInstance.to(getVenueRoom(venueId)).emit('venue_availability_updated', payload);
}

module.exports = {
  setIO,
  getVenueRoom,
  getVenueDateRoom,
  emitVenueAvailabilityUpdate,
};
