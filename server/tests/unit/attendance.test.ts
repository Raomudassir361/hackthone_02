import { describe, it, expect } from 'vitest';
import {
  isCheckInLate,
  calculateWorkedMinutes,
  isHalfDayWorked,
  determineAttendanceStatus,
  RuleSnapshot,
} from '../../src/modules/attendance/status.js';

describe('Attendance Status Logic', () => {
  const defaultRule: RuleSnapshot = {
    officeStart: '09:00',
    graceMinutes: 15,
    halfDayHours: 5,
  };

  describe('isCheckInLate Boundary Tests', () => {
    it('is On-Time at 09:00:00 (exact office start)', () => {
      // 09:00:00 PKT is 04:00:00 UTC
      const date = new Date('2026-10-26T04:00:00.000Z');
      expect(isCheckInLate(date, defaultRule, 'Asia/Karachi')).toBe(false);
    });

    it('is On-Time at 09:15:00 (exact grace cutoff boundary)', () => {
      // 09:15:00 PKT is 04:15:00 UTC
      const date = new Date('2026-10-26T04:15:00.000Z');
      expect(isCheckInLate(date, defaultRule, 'Asia/Karachi')).toBe(false);
    });

    it('is Late at 09:15:01 (1 second past grace cutoff)', () => {
      // 09:15:01 PKT is 04:15:01 UTC
      const date = new Date('2026-10-26T04:15:01.000Z');
      expect(isCheckInLate(date, defaultRule, 'Asia/Karachi')).toBe(true);
    });

    it('is Late at 09:30:00', () => {
      const date = new Date('2026-10-26T04:30:00.000Z');
      expect(isCheckInLate(date, defaultRule, 'Asia/Karachi')).toBe(true);
    });
  });

  describe('Worked Minutes and Half-Day Thresholds', () => {
    it('calculates worked minutes correctly', () => {
      const inTime = new Date('2026-10-26T04:00:00.000Z');
      const outTime = new Date('2026-10-26T09:30:00.000Z'); // 5.5 hours = 330 minutes
      const worked = calculateWorkedMinutes(inTime, outTime);
      expect(worked).toBe(330);
    });

    it('identifies half-day when worked under 5 hours (e.g. 299 mins)', () => {
      expect(isHalfDayWorked(299, 5)).toBe(true);
      expect(isHalfDayWorked(300, 5)).toBe(false); // 5h exact is full day
      expect(isHalfDayWorked(480, 5)).toBe(false); // 8h
    });
  });

  describe('determineAttendanceStatus Combinations', () => {
    it('returns half_day if worked minutes < 5 hours even if checked in on time', () => {
      const status = determineAttendanceStatus({
        isLate: false,
        hasCheckedOut: true,
        workedMinutes: 240, // 4 hours
        halfDayHours: 5,
      });
      expect(status).toBe('half_day');
    });

    it('returns late if checked in late and worked >= 5 hours', () => {
      const status = determineAttendanceStatus({
        isLate: true,
        hasCheckedOut: true,
        workedMinutes: 360, // 6 hours
        halfDayHours: 5,
      });
      expect(status).toBe('late');
    });

    it('returns present if checked in on time and worked >= 5 hours', () => {
      const status = determineAttendanceStatus({
        isLate: false,
        hasCheckedOut: true,
        workedMinutes: 480,
        halfDayHours: 5,
      });
      expect(status).toBe('present');
    });

    it('returns missing_checkout for past day without checkout', () => {
      const status = determineAttendanceStatus({
        isLate: false,
        hasCheckedOut: false,
        workedMinutes: 0,
        halfDayHours: 5,
        isPastDay: true,
      });
      expect(status).toBe('missing_checkout');
    });
  });
});
