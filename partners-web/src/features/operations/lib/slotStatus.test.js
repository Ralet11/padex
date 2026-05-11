import { describe, it, expect } from 'vitest';
import {
  SLOT_STATE,
  OPERATIONS_SLOT_STATUS,
  getOperationalSlotState,
  isOperationallyAvailable,
  isManualPartnerReservation,
  getSlotStatus,
} from './slotStatus';

describe('slotStatus.js', () => {
  describe('SLOT_STATE', () => {
    it('defines all expected states', () => {
      expect(SLOT_STATE.AVAILABLE).toBe('available');
      expect(SLOT_STATE.RELEASED).toBe('released');
      expect(SLOT_STATE.RESERVED).toBe('reserved');
      expect(SLOT_STATE.BLOCKED).toBe('blocked');
      expect(SLOT_STATE.COMPLETED).toBe('completed');
      expect(SLOT_STATE.HELD).toBe('held');
      expect(SLOT_STATE.OCCUPIED).toBe('occupied');
    });
  });

  describe('OPERATIONS_SLOT_STATUS', () => {
    it('groups free states correctly', () => {
      expect(OPERATIONS_SLOT_STATUS.free).toContain('available');
      expect(OPERATIONS_SLOT_STATUS.free).toContain('released');
    });

    it('groups app-committed states correctly', () => {
      expect(OPERATIONS_SLOT_STATUS.appCommitted).toContain('reserved');
      expect(OPERATIONS_SLOT_STATUS.appCommitted).toContain('held');
      expect(OPERATIONS_SLOT_STATUS.appCommitted).toContain('occupied');
    });

    it('groups manual block states correctly', () => {
      expect(OPERATIONS_SLOT_STATUS.manualBlock).toContain('blocked');
    });

    it('groups completed states correctly', () => {
      expect(OPERATIONS_SLOT_STATUS.completed).toContain('completed');
    });
  });

  describe('getOperationalSlotState', () => {
    it('returns slot.state when present', () => {
      expect(getOperationalSlotState({ state: 'available' })).toBe('available');
      expect(getOperationalSlotState({ state: 'blocked' })).toBe('blocked');
    });

    it('prioritizes manual booking markers over a stale available state', () => {
      expect(getOperationalSlotState({ state: 'available', booked_externally: true })).toBe('blocked');
      expect(getOperationalSlotState({ state: 'available', occupant_name: 'Juan' })).toBe('blocked');
    });

    it('returns blocked when booked_externally is true', () => {
      expect(getOperationalSlotState({ booked_externally: true })).toBe('blocked');
    });

    it('returns blocked when occupant_name is present', () => {
      expect(getOperationalSlotState({ occupant_name: 'Juan' })).toBe('blocked');
    });

    it('returns blocked when occupant_phone is present', () => {
      expect(getOperationalSlotState({ occupant_phone: '123456' })).toBe('blocked');
    });

    it('returns reserved when is_available is false', () => {
      expect(getOperationalSlotState({ is_available: false })).toBe('reserved');
    });

    it('returns available as default', () => {
      expect(getOperationalSlotState({})).toBe('available');
      expect(getOperationalSlotState(null)).toBe('available');
      expect(getOperationalSlotState(undefined)).toBe('available');
    });
  });

  describe('isManualPartnerReservation', () => {
    it('identifies manual partner reservations by booking markers', () => {
      expect(isManualPartnerReservation({ booked_externally: true })).toBe(true);
      expect(isManualPartnerReservation({ occupant_name: 'Maria' })).toBe(true);
      expect(isManualPartnerReservation({ occupant_phone: '123' })).toBe(true);
      expect(isManualPartnerReservation({ state: 'reserved' })).toBe(false);
    });
  });

  describe('isOperationallyAvailable', () => {
    it('returns true for available slots', () => {
      expect(isOperationallyAvailable({ state: 'available' })).toBe(true);
      expect(isOperationallyAvailable({ state: 'released' })).toBe(true);
    });

    it('returns false for non-available slots', () => {
      expect(isOperationallyAvailable({ state: 'available', booked_externally: true })).toBe(false);
      expect(isOperationallyAvailable({ state: 'blocked' })).toBe(false);
      expect(isOperationallyAvailable({ state: 'reserved' })).toBe(false);
      expect(isOperationallyAvailable({ state: 'completed' })).toBe(false);
      expect(isOperationallyAvailable({ state: 'occupied' })).toBe(false);
    });
  });

  describe('getSlotStatus', () => {
    it('returns free status for available slots', () => {
      const status = getSlotStatus({ state: 'available' });
      expect(status.key).toBe('free');
      expect(status.label).toBe('Disponible');
      expect(status.detail).toBe('Listo para tomar');
    });

    it('returns busy status for manually reserved slots even if state is stale', () => {
      const status = getSlotStatus({ state: 'available', booked_externally: true, occupant_name: 'Maria' });
      expect(status.key).toBe('busy');
      expect(status.label).toBe('Bloqueado');
      expect(status.detail).toBe('Maria');
    });

    it('returns busy status for blocked slots with occupant', () => {
      const status = getSlotStatus({ state: 'blocked', occupant_name: 'Maria' });
      expect(status.key).toBe('busy');
      expect(status.label).toBe('Bloqueado');
      expect(status.detail).toBe('Maria');
    });

    it('returns busy status for completed slots', () => {
      const status = getSlotStatus({ state: 'completed' });
      expect(status.key).toBe('busy');
      expect(status.label).toBe('Cerrado');
      expect(status.detail).toBe('Turno ya jugado');
    });

    it('returns busy status for app-committed slots', () => {
      const status = getSlotStatus({ state: 'reserved' });
      expect(status.key).toBe('busy');
      expect(status.label).toBe('Tomado por PADEX');
      expect(status.detail).toBe('Comprometido por la app');
    });
  });
});
