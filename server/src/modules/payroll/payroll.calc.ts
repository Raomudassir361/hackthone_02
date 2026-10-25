import { round2 } from '../../shared/money.js';

export interface TaxCalculationResult {
  annualTaxable: number;
  annualTax: number;
  monthlyTax: number;
}

export interface PayrollCalculationInput {
  basicSalary: number;
  workingDaysInMonth: number;
  absentDays: number;
  unpaidLeaveDays: number;
  halfDays: number;
  proratedDeductionDays?: number; // working days in month before joinDate or after exitDate
  lateCount?: number; // T10.2: count of late arrivals
  latePenaltyEnabled?: boolean; // T10.2: 3 lates = 0.5 day deduction
  hraPct?: number; // default 40%
  medicalPct?: number; // default 10%
}

export interface PayrollCalculationResult {
  basic: number;
  hra: number;
  medical: number;
  gross: number;
  workingDays: number;
  perDayRate: number;
  absentDays: number;
  unpaidDays: number;
  halfDays: number;
  latePenaltyDays?: number;
  deductionDays: number;
  deductionAmount: number;
  annualTaxable: number;
  annualTax: number;
  monthlyTax: number;
  net: number;
}

/**
 * Calculates annual income tax based on the 5-tier company tax slabs in rules.md (Section 3.6).
 * Slabs on Gross * 12:
 * 0 - 600,000: 0%
 * 600,001 - 1,200,000: 5% of amount > 600,000
 * 1,200,001 - 2,400,000: 30,000 + 15% of amount > 1,200,000
 * 2,400,001 - 3,600,000: 210,000 + 25% of amount > 2,400,000
 * > 3,600,000: 510,000 + 35% of amount > 3,600,000
 */
export function calculateAnnualTax(annualTaxable: number): TaxCalculationResult {
  const annual = Math.max(0, annualTaxable);
  let annualTax = 0;

  if (annual <= 600000) {
    annualTax = 0;
  } else if (annual <= 1200000) {
    annualTax = (annual - 600000) * 0.05;
  } else if (annual <= 2400000) {
    annualTax = 30000 + (annual - 1200000) * 0.15;
  } else if (annual <= 3600000) {
    annualTax = 210000 + (annual - 2400000) * 0.25;
  } else {
    annualTax = 510000 + (annual - 3600000) * 0.35;
  }

  const roundedAnnualTax = round2(annualTax);
  const monthlyTax = round2(roundedAnnualTax / 12);

  return {
    annualTaxable: round2(annual),
    annualTax: roundedAnnualTax,
    monthlyTax,
  };
}

/**
 * Calculates a complete single employee monthly payroll line snapshot.
 */
export function calculatePayrollLine(input: PayrollCalculationInput): PayrollCalculationResult {
  const basic = round2(input.basicSalary);
  const hraPct = input.hraPct ?? 40;
  const medicalPct = input.medicalPct ?? 10;

  const hra = round2(basic * (hraPct / 100));
  const medical = round2(basic * (medicalPct / 100));
  // Gross = 1.5 * basic (HRA 40% + medical 10% + basic 100% = 150%)
  const gross = round2(basic + hra + medical);

  const workingDays = input.workingDaysInMonth > 0 ? input.workingDaysInMonth : 1;
  const perDayRate = round2(gross / workingDays);

  const absentDays = Number(input.absentDays) || 0;
  const unpaidDays = Number(input.unpaidLeaveDays) || 0;
  const halfDays = Number(input.halfDays) || 0;
  const proratedDays = Number(input.proratedDeductionDays) || 0;

  // T10.2: 3 lates = 0.5 day deduction
  const lateCount = Number(input.lateCount) || 0;
  const latePenaltyDays = input.latePenaltyEnabled ? Math.floor(lateCount / 3) * 0.5 : 0;

  // Deduction days = absent + unpaid + 0.5 * halfDays + proratedDays + latePenaltyDays
  const deductionDays = round2(absentDays + unpaidDays + 0.5 * halfDays + proratedDays + latePenaltyDays);
  // Deduction amount = deduction days * per day rate
  const deductionAmount = round2(deductionDays * perDayRate);

  const tax = calculateAnnualTax(gross * 12);

  // Net = gross - deduction amount - monthly tax (never less than 0)
  const net = round2(Math.max(0, gross - deductionAmount - tax.monthlyTax));

  return {
    basic,
    hra,
    medical,
    gross,
    workingDays,
    perDayRate,
    absentDays,
    unpaidDays,
    halfDays,
    latePenaltyDays,
    deductionDays,
    deductionAmount,
    annualTaxable: tax.annualTaxable,
    annualTax: tax.annualTax,
    monthlyTax: tax.monthlyTax,
    net,
  };
}
