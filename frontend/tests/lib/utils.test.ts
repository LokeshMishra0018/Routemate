import { describe, it, expect } from 'vitest';
import { cn, formatIndianCurrency, formatTime } from '../../src/lib/utils';

describe('Utility Functions', () => {
  describe('cn (Classnames Merger)', () => {
    it('merges multiple conditional classes and resolves tailwind conflicts', () => {
      const result = cn('px-4 py-2', true && 'bg-indigo-600', false && 'text-red-500', 'px-6');
      expect(result).toContain('py-2');
      expect(result).toContain('bg-indigo-600');
      expect(result).toContain('px-6');
      expect(result).not.toContain('px-4'); // overridden by px-6
      expect(result).not.toContain('text-red-500');
    });
  });

  describe('formatIndianCurrency', () => {
    it('formats Indian rupee amounts with symbol and comma groupings', () => {
      expect(formatIndianCurrency(500)).toBe('₹500');
      expect(formatIndianCurrency(1250)).toBe('₹1,250');
      expect(formatIndianCurrency(0)).toBe('₹0');
    });
  });

  describe('formatTime', () => {
    it('formats HH:mm strings into 12-hour time with AM/PM', () => {
      expect(formatTime('09:30')).toBe('09:30 AM');
      expect(formatTime('14:15')).toBe('02:15 PM');
      expect(formatTime('00:00')).toBe('12:00 AM');
      expect(formatTime('12:00')).toBe('12:00 PM');
    });

    it('handles undefined or invalid time gracefully', () => {
      expect(formatTime(undefined)).toBe('');
      expect(formatTime('')).toBe('');
      expect(formatTime('invalid')).toBe('invalid');
    });
  });
});
