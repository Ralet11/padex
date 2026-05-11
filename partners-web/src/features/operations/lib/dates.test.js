import { describe, it, expect } from 'vitest';
import { todayStr, offsetDateStr, shiftDateStr, formatDateLabel } from './dates';

describe('dates.js', () => {
  describe('todayStr', () => {
    it('returns today date in YYYY-MM-DD format', () => {
      const result = todayStr();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const today = new Date();
      const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      expect(result).toBe(expected);
    });
  });

  describe('offsetDateStr', () => {
    it('returns tomorrow when offset is 1', () => {
      const today = new Date();
      today.setDate(today.getDate() + 1);
      const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      expect(offsetDateStr(1)).toBe(expected);
    });

    it('returns yesterday when offset is -1', () => {
      const today = new Date();
      today.setDate(today.getDate() - 1);
      const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      expect(offsetDateStr(-1)).toBe(expected);
    });

    it('returns today when offset is 0', () => {
      expect(offsetDateStr(0)).toBe(todayStr());
    });
  });

  describe('shiftDateStr', () => {
    it('shifts a date string forward', () => {
      expect(shiftDateStr('2026-01-15', 1)).toBe('2026-01-16');
    });

    it('shifts a date string backward', () => {
      expect(shiftDateStr('2026-01-15', -1)).toBe('2026-01-14');
    });

    it('handles month boundaries', () => {
      expect(shiftDateStr('2026-01-31', 1)).toBe('2026-02-01');
    });

    it('handles year boundaries', () => {
      expect(shiftDateStr('2025-12-31', 1)).toBe('2026-01-01');
    });

    it('returns same date when offset is 0', () => {
      expect(shiftDateStr('2026-06-15', 0)).toBe('2026-06-15');
    });
  });

  describe('formatDateLabel', () => {
    it('returns short format by default', () => {
      const result = formatDateLabel('2026-01-15');
      // es-AR short format: "jue 15 ene" or similar
      expect(result).toContain('15');
      expect(result.length).toBeLessThan(25);
    });

    it('returns long format when second arg is true', () => {
      const result = formatDateLabel('2026-01-15', true);
      // es-AR long format: "jueves, 15 de enero"
      expect(result).toContain('15');
      expect(result.length).toBeGreaterThan(result.replace(/de|,| /g, '').length);
    });
  });
});
