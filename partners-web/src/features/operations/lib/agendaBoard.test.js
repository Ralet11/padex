import { describe, expect, it } from 'vitest';
import {
  BOARD_STEP_MINUTES,
  buildTimelineFromSlots,
  formatMinutesToTime,
  formatSlotRange,
  getSlotLayout,
  parseTimeToMinutes,
} from './agendaBoard';

describe('agendaBoard.js', () => {
  describe('parseTimeToMinutes', () => {
    it('parses valid time strings', () => {
      expect(parseTimeToMinutes('08:30')).toBe(510);
      expect(parseTimeToMinutes('23:00')).toBe(1380);
    });

    it('returns null for invalid values', () => {
      expect(parseTimeToMinutes('8:30')).toBeNull();
      expect(parseTimeToMinutes('25:00')).toBe(1500);
      expect(parseTimeToMinutes(null)).toBeNull();
    });
  });

  describe('formatMinutesToTime', () => {
    it('formats whole and half hours', () => {
      expect(formatMinutesToTime(510)).toBe('08:30');
      expect(formatMinutesToTime(1440)).toBe('24:00');
    });
  });

  describe('formatSlotRange', () => {
    it('formats a 90 minute slot range', () => {
      expect(formatSlotRange({ time: '17:00', duration: 90 })).toBe('17:00 - 18:30');
    });
  });

  describe('buildTimelineFromSlots', () => {
    it('keeps the full day visible and snaps to full hours', () => {
      const timeline = buildTimelineFromSlots([
        { time: '08:30', duration: 90 },
        { time: '17:00', duration: 90 },
      ]);

      expect(timeline.startMinutes).toBe(7 * 60);
      expect(timeline.endMinutes).toBe(23 * 60);
      expect(timeline.totalSteps).toBe((16 * 60) / BOARD_STEP_MINUTES);
      expect(timeline.hourMarkers[0]).toMatchObject({ label: '07', columnStart: 1, spanSteps: 2 });
      expect(timeline.hourMarkers.at(-1)).toMatchObject({ label: '22', columnStart: 31, spanSteps: 2 });
    });

    it('falls back to default board hours when there are no slots', () => {
      const timeline = buildTimelineFromSlots([]);

      expect(timeline.startMinutes).toBe(7 * 60);
      expect(timeline.endMinutes).toBe(23 * 60);
    });
  });

  describe('getSlotLayout', () => {
    it('maps a slot into board columns', () => {
      const timeline = buildTimelineFromSlots([{ time: '08:00', duration: 90 }]);

      expect(getSlotLayout({ time: '09:30', duration: 90 }, timeline)).toMatchObject({
        startMinutes: 570,
        endMinutes: 660,
        columnStart: 6,
        columnSpan: 3,
      });
    });
  });
});
