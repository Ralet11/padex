import { describe, it, expect } from 'vitest';
import {
  EMPTY_COURT_FORM,
  createWindow,
  createRule,
  slotsToWindows,
  createVenueFormState,
  createCourtFormState,
} from './selectors';

describe('selectors.js', () => {
  describe('EMPTY_COURT_FORM', () => {
    it('has expected shape', () => {
      expect(EMPTY_COURT_FORM).toHaveProperty('id', null);
      expect(EMPTY_COURT_FORM).toHaveProperty('name', '');
      expect(EMPTY_COURT_FORM).toHaveProperty('type', 'Cristal');
      expect(EMPTY_COURT_FORM).toHaveProperty('surface', '');
      expect(EMPTY_COURT_FORM).toHaveProperty('enclosure', '');
      expect(EMPTY_COURT_FORM).toHaveProperty('image', '');
    });
  });

  describe('createWindow', () => {
    it('creates a window with default times', () => {
      const w = createWindow();
      expect(w).toHaveProperty('id');
      expect(w.start_time).toBe('08:00');
      expect(w.end_time).toBe('15:00');
    });

    it('creates a window with custom times', () => {
      const w = createWindow('10:00', '18:00');
      expect(w.start_time).toBe('10:00');
      expect(w.end_time).toBe('18:00');
    });

    it('generates unique ids', () => {
      const w1 = createWindow();
      const w2 = createWindow();
      expect(w1.id).not.toBe(w2.id);
    });
  });

  describe('createRule', () => {
    it('creates a rule with default weekdays and windows', () => {
      const r = createRule();
      expect(r).toHaveProperty('id');
      expect(r.weekdays).toEqual([1, 2, 3]);
      expect(r.windows).toHaveLength(2);
    });

    it('creates a rule with custom values', () => {
      const w = createWindow('09:00', '12:00');
      const r = createRule([1, 3, 5], [w]);
      expect(r.weekdays).toEqual([1, 3, 5]);
      expect(r.windows).toEqual([w]);
    });
  });

  describe('slotsToWindows', () => {
    it('returns default window for empty slots', () => {
      const windows = slotsToWindows([]);
      expect(windows).toHaveLength(1);
      expect(windows[0].start_time).toBe('08:00');
      expect(windows[0].end_time).toBe('15:00');
    });

    it('derives windows from contiguous 90-min slots', () => {
      const slots = [
        { time: '08:00' },
        { time: '09:30' },
        { time: '11:00' },
      ];
      const windows = slotsToWindows(slots);
      expect(windows).toHaveLength(1);
      expect(windows[0].start_time).toBe('08:00');
      expect(windows[0].end_time).toBe('12:30');
    });

    it('splits windows when there is a gap', () => {
      const slots = [
        { time: '08:00' },
        { time: '09:30' },
        { time: '17:00' },
        { time: '18:30' },
      ];
      const windows = slotsToWindows(slots);
      expect(windows).toHaveLength(2);
      expect(windows[0].start_time).toBe('08:00');
      expect(windows[0].end_time).toBe('11:00');
      expect(windows[1].start_time).toBe('17:00');
      expect(windows[1].end_time).toBe('20:00');
    });

    it('handles single slot', () => {
      const slots = [{ time: '14:00' }];
      const windows = slotsToWindows(slots);
      expect(windows).toHaveLength(1);
      expect(windows[0].start_time).toBe('14:00');
      expect(windows[0].end_time).toBe('15:30');
    });
  });

  describe('createVenueFormState', () => {
    it('creates form state from venue object', () => {
      const venue = {
        name: 'Test Club',
        address: 'Calle 123',
        phone: '555-1234',
        image: '/img.jpg',
        price_per_slot: 15000,
        services: ['wifi', 'parking'],
      };
      const form = createVenueFormState(venue);
      expect(form.name).toBe('Test Club');
      expect(form.address).toBe('Calle 123');
      expect(form.address_place_id).toBe('');
      expect(form.address_lat).toBeNull();
      expect(form.address_lng).toBeNull();
      expect(form.phone).toBe('555-1234');
      expect(form.image).toBe('/img.jpg');
      expect(form.price_per_slot).toBe(15000);
      expect(form.services).toEqual(['wifi', 'parking']);
    });

    it('handles null/undefined venue', () => {
      const form = createVenueFormState(null);
      expect(form.name).toBe('');
      expect(form.address_place_id).toBe('');
      expect(form.services).toEqual([]);
      expect(form.price_per_slot).toBe('');
    });

    it('defaults services to empty array for non-array input', () => {
      const form = createVenueFormState({ services: 'not-array' });
      expect(form.services).toEqual([]);
    });
  });

  describe('createCourtFormState', () => {
    it('creates empty form state when no court', () => {
      const form = createCourtFormState();
      expect(form).toEqual(EMPTY_COURT_FORM);
    });

    it('creates form state from court object', () => {
      const court = {
        id: 1,
        name: 'Cancha 1',
        type: 'Muro',
        surface: 'cesped',
        enclosure: 'vidrio',
        image: '/court.jpg',
      };
      const form = createCourtFormState(court);
      expect(form.id).toBe(1);
      expect(form.name).toBe('Cancha 1');
      expect(form.type).toBe('Muro');
      expect(form.surface).toBe('cesped');
      expect(form.enclosure).toBe('vidrio');
      expect(form.image).toBe('/court.jpg');
    });

    it('defaults missing fields', () => {
      const form = createCourtFormState({ id: 5 });
      expect(form.id).toBe(5);
      expect(form.name).toBe('');
      expect(form.type).toBe('Cristal');
    });
  });
});
