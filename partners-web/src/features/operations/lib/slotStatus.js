export const SLOT_STATE = {
  AVAILABLE: 'available',
  RELEASED: 'released',
  RESERVED: 'reserved',
  BLOCKED: 'blocked',
  COMPLETED: 'completed',
  HELD: 'held',
  OCCUPIED: 'occupied',
};

export const OPERATIONS_SLOT_STATUS = {
  free: [SLOT_STATE.AVAILABLE, SLOT_STATE.RELEASED],
  appCommitted: [SLOT_STATE.RESERVED, SLOT_STATE.HELD, SLOT_STATE.OCCUPIED],
  manualBlock: [SLOT_STATE.BLOCKED],
  completed: [SLOT_STATE.COMPLETED],
};

export function isManualPartnerReservation(slot) {
  return Boolean(slot?.booked_externally || slot?.occupant_name || slot?.occupant_phone);
}

export function getOperationalSlotState(slot) {
  if (isManualPartnerReservation(slot)) return SLOT_STATE.BLOCKED;
  if (slot?.state) return slot.state;
  return slot?.is_available === false ? SLOT_STATE.RESERVED : SLOT_STATE.AVAILABLE;
}

export function isOperationallyAvailable(slot) {
  const slotState = getOperationalSlotState(slot);
  return slotState === SLOT_STATE.AVAILABLE || slotState === SLOT_STATE.RELEASED;
}

export function getSlotStatus(slot) {
  const slotState = getOperationalSlotState(slot);
  if (slotState === SLOT_STATE.AVAILABLE || slotState === SLOT_STATE.RELEASED) return { key: 'free', label: 'Disponible', detail: 'Listo para tomar' };
  if (slotState === SLOT_STATE.BLOCKED || slot.booked_externally) return { key: 'busy', label: 'Bloqueado', detail: slot.occupant_name || 'Reserva manual' };
  if (slotState === SLOT_STATE.COMPLETED) return { key: 'busy', label: 'Cerrado', detail: 'Turno ya jugado' };
  return { key: 'busy', label: 'Tomado por PADEX', detail: 'Comprometido por la app' };
}
