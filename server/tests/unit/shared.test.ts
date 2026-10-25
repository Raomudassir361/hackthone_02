import { describe, it, expect } from 'vitest';
import { countWorkingDays, isWorkingDay } from '../../src/shared/workingDays.js';
import { getCompanyTodayString, isValidISODateString } from '../../src/shared/dates.js';
import { calculateDistanceMeters, isWithinRadius } from '../../src/shared/haversine.js';
import { roundMoney, formatPKR } from '../../src/shared/money.js';
import { buildPaginationResponse } from '../../src/shared/pagination.js';

describe('Shared Utilities', () => {
  describe('workingDays', () => {
    it('correctly counts working days skipping default Saturday and Sunday', () => {
      // 2026-10-19 is Monday, 2026-10-25 is Sunday
      // Mon, Tue, Wed, Thu, Fri = 5 working days
      const days = countWorkingDays({
        startDate: '2026-10-19',
        endDate: '2026-10-25',
      });
      expect(days).toBe(5);
    });

    it('correctly excludes public holidays', () => {
      const days = countWorkingDays({
        startDate: '2026-10-19',
        endDate: '2026-10-25',
        holidayDates: ['2026-10-20'], // Tuesday holiday
      });
      expect(days).toBe(4);
    });

    it('returns 0 if start date is after end date', () => {
      const days = countWorkingDays({
        startDate: '2026-10-25',
        endDate: '2026-10-19',
      });
      expect(days).toBe(0);
    });

    it('checks if a single day is a working day', () => {
      // 2026-10-24 is Saturday
      expect(isWorkingDay('2026-10-24')).toBe(false);
      // 2026-10-23 is Friday
      expect(isWorkingDay('2026-10-23')).toBe(true);
      // 2026-10-23 as holiday
      expect(isWorkingDay('2026-10-23', [0, 6], ['2026-10-23'])).toBe(false);
    });
  });

  describe('dates', () => {
    it('validates ISO date strings', () => {
      expect(isValidISODateString('2026-10-24')).toBe(true);
      expect(isValidISODateString('invalid-date')).toBe(false);
      expect(isValidISODateString('24-10-2026')).toBe(false);
    });

    it('formats today according to timezone', () => {
      const todayStr = getCompanyTodayString('Asia/Karachi');
      expect(todayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('haversine', () => {
    it('calculates distance between two coordinates accurately', () => {
      // Distance between Zaitoon Ashraf IT Park Karachi and nearby point (~100m)
      const lat1 = 24.8607;
      const lon1 = 67.0011;
      const lat2 = 24.8615;
      const lon2 = 67.0015;
      const dist = calculateDistanceMeters(lat1, lon1, lat2, lon2);
      expect(dist).toBeGreaterThan(80);
      expect(dist).toBeLessThan(120);
    });

    it('validates whether point is within radius', () => {
      expect(isWithinRadius(24.8607, 67.0011, 24.8607, 67.0011, 50)).toBe(true);
      expect(isWithinRadius(24.8607, 67.0011, 25.0000, 67.0000, 50)).toBe(false);
    });
  });

  describe('money', () => {
    it('rounds numbers to 2 decimal places properly', () => {
      expect(roundMoney(4090.90909)).toBe(4090.91);
      expect(roundMoney(79818.1818)).toBe(79818.18);
      expect(roundMoney(100)).toBe(100);
    });

    it('formats PKR properly', () => {
      expect(formatPKR(90000)).toBe('PKR 90,000.00');
    });
  });

  describe('pagination', () => {
    it('builds proper paginated response object', () => {
      const items = [1, 2, 3];
      const res = buildPaginationResponse(items, 25, 1, 10);
      expect(res.data).toEqual(items);
      expect(res.pagination.total).toBe(25);
      expect(res.pagination.totalPages).toBe(3);
      expect(res.pagination.hasNextPage).toBe(true);
      expect(res.pagination.hasPrevPage).toBe(false);
    });
  });
});
