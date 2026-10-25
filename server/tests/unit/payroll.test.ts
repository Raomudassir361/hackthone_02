import { describe, it, expect } from 'vitest';
import { calculateAnnualTax, calculatePayrollLine } from '../../src/modules/payroll/payroll.calc.js';

describe('Payroll Pure Calculation Unit Tests (rules.md Section 3.6)', () => {
  describe('Tax Slab Vectors', () => {
    // Vector 1: Gross 45,000 -> Annual 540,000 -> Annual Tax 0 -> Monthly Tax 0
    it('calculates tax for gross 45,000 (annual 540,000)', () => {
      const res = calculateAnnualTax(45000 * 12);
      expect(res.annualTaxable).toBe(540000);
      expect(res.annualTax).toBe(0);
      expect(res.monthlyTax).toBe(0);
    });

    // Vector 2: Gross 60,000 -> Annual 720,000 -> Annual Tax 6,000 -> Monthly Tax 500
    it('calculates tax for gross 60,000 (annual 720,000)', () => {
      const res = calculateAnnualTax(60000 * 12);
      expect(res.annualTaxable).toBe(720000);
      expect(res.annualTax).toBe(6000);
      expect(res.monthlyTax).toBe(500);
    });

    // Vector 3: Gross 100,000 -> Annual 1,200,000 -> Annual Tax 30,000 -> Monthly Tax 2,500
    it('calculates tax for gross 100,000 (annual 1,200,000)', () => {
      const res = calculateAnnualTax(100000 * 12);
      expect(res.annualTaxable).toBe(1200000);
      expect(res.annualTax).toBe(30000);
      expect(res.monthlyTax).toBe(2500);
    });

    // Vector 4: Gross 150,000 -> Annual 1,800,000 -> Annual Tax 120,000 -> Monthly Tax 10,000
    it('calculates tax for gross 150,000 (annual 1,800,000)', () => {
      const res = calculateAnnualTax(150000 * 12);
      expect(res.annualTaxable).toBe(1800000);
      expect(res.annualTax).toBe(120000);
      expect(res.monthlyTax).toBe(10000);
    });

    // Vector 5: Gross 300,000 -> Annual 3,600,000 -> Annual Tax 510,000 -> Monthly Tax 42,500
    it('calculates tax for gross 300,000 (annual 3,600,000)', () => {
      const res = calculateAnnualTax(300000 * 12);
      expect(res.annualTaxable).toBe(3600000);
      expect(res.annualTax).toBe(510000);
      expect(res.monthlyTax).toBe(42500);
    });

    // Tier 5 (> 3,600,000): e.g. Gross 400,000 -> Annual 4,800,000
    // Tax = 510,000 + 35% * (4,800,000 - 3,600,000) = 510,000 + 420,000 = 930,000
    it('calculates tax for top bracket > 3,600,000', () => {
      const res = calculateAnnualTax(400000 * 12);
      expect(res.annualTaxable).toBe(4800000);
      expect(res.annualTax).toBe(930000);
      expect(res.monthlyTax).toBe(77500);
    });
  });

  describe('Full Payroll Calculation Example Vector (rules.md Section 3.6)', () => {
    /**
     * "Full example: basic 60,000 → gross 90,000 (HRA 24,000 + medical 6,000 + basic 60,000 = 90,000).
     * Annual 1,080,000 → tax 5% × 480,000 = 24,000 → monthly 2,000.
     * Month has 22 working days → per day 4,090.91.
     * Absent 1, unpaid 0, half days 2 → deduction days 2.0 → deduction 8,181.82.
     * Net = 90,000 − 8,181.82 − 2,000 = 79,818.18."
     */
    it('matches the comprehensive full example vector from rules.md', () => {
      const line = calculatePayrollLine({
        basicSalary: 60000,
        workingDaysInMonth: 22,
        absentDays: 1,
        unpaidLeaveDays: 0,
        halfDays: 2,
      });

      expect(line.basic).toBe(60000);
      expect(line.hra).toBe(24000);
      expect(line.medical).toBe(6000);
      expect(line.gross).toBe(90000);
      expect(line.annualTaxable).toBe(1080000);
      expect(line.annualTax).toBe(24000);
      expect(line.monthlyTax).toBe(2000);
      expect(line.workingDays).toBe(22);
      expect(line.perDayRate).toBe(4090.91);
      expect(line.deductionDays).toBe(2);
      expect(line.deductionAmount).toBe(8181.82);
      expect(line.net).toBe(79818.18);
    });

    it('accounts for mid-month joiner / leaver proration deduction days', () => {
      const line = calculatePayrollLine({
        basicSalary: 60000,
        workingDaysInMonth: 22,
        absentDays: 0,
        unpaidLeaveDays: 0,
        halfDays: 0,
        proratedDeductionDays: 5, // joined 5 working days into the month
      });

      expect(line.deductionDays).toBe(5);
      expect(line.deductionAmount).toBe(20454.55); // 5 * 4090.91
      expect(line.net).toBe(67545.45); // 90,000 - 20454.55 - 2000
    });

    it('T10.2: calculates late penalty deductions when enabled (3 lates = 0.5 day)', () => {
      // 7 lates -> Math.floor(7/3) * 0.5 = 1.0 day deduction
      const line = calculatePayrollLine({
        basicSalary: 60000,
        workingDaysInMonth: 22,
        absentDays: 0,
        unpaidLeaveDays: 0,
        halfDays: 0,
        lateCount: 7,
        latePenaltyEnabled: true,
      });

      expect(line.latePenaltyDays).toBe(1.0);
      expect(line.deductionDays).toBe(1.0);
      expect(line.deductionAmount).toBe(4090.91);
      expect(line.net).toBe(83909.09); // 90,000 - 4090.91 - 2000
    });
  });
});
