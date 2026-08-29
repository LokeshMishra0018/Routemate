import { describe, it, expect } from 'vitest';
import { calculateHaversineKm, formatDuration } from '../../src/services/routing.service';
import { searchPlaces } from '../../src/services/geocoding.service';

describe('Geospatial & Road Routing Services', () => {
  describe('calculateHaversineKm', () => {
    it('calculates accurate distance between Ghaziabad (KIET) and New Delhi', () => {
      // KIET: [28.7532, 77.4977], New Delhi: [28.6139, 77.2090]
      const distance = calculateHaversineKm(28.7532, 77.4977, 28.6139, 77.209);
      expect(distance).toBeGreaterThan(30);
      expect(distance).toBeLessThan(40);
      expect(typeof distance).toBe('number');
    });

    it('returns 0 for identical points', () => {
      const distance = calculateHaversineKm(28.7532, 77.4977, 28.7532, 77.4977);
      expect(distance).toBe(0);
    });

    it('calculates long distance across Indian cities (Delhi to Mumbai)', () => {
      // Delhi: [28.6139, 77.2090], Mumbai: [19.0760, 72.8777]
      const distance = calculateHaversineKm(28.6139, 77.209, 19.076, 72.8777);
      expect(distance).toBeGreaterThan(1100);
      expect(distance).toBeLessThan(1200);
    });
  });

  describe('formatDuration', () => {
    it('formats seconds under a minute', () => {
      expect(formatDuration(45)).toBe('45s');
    });

    it('formats minutes', () => {
      expect(formatDuration(1800)).toBe('30 min');
      expect(formatDuration(2700)).toBe('45 min');
    });

    it('formats hours and minutes', () => {
      expect(formatDuration(3600)).toBe('1 hr');
      expect(formatDuration(4500)).toBe('1 hr 15 min');
      expect(formatDuration(7200)).toBe('2 hr');
    });
  });

  describe('searchPlaces (Input Handling & Sanitization)', () => {
    it('returns empty array for empty or short queries without throwing', async () => {
      const emptyResult = await searchPlaces('');
      expect(emptyResult).toEqual([]);

      const singleCharResult = await searchPlaces('a');
      expect(singleCharResult).toEqual([]);
    });
  });
});
