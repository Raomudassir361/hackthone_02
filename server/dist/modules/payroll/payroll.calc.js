"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateAnnualTax = calculateAnnualTax;
exports.calculatePayrollLine = calculatePayrollLine;
const money_js_1 = require("../../shared/money.js");
/**
 * Calculates annual income tax based on the 5-tier company tax slabs in rules.md (Section 3.6).
 * Slabs on Gross * 12:
 * 0 - 600,000: 0%
 * 600,001 - 1,200,000: 5% of amount > 600,000
 * 1,200,001 - 2,400,000: 30,000 + 15% of amount > 1,200,000
 * 2,400,001 - 3,600,000: 210,000 + 25% of amount > 2,400,000
 * > 3,600,000: 510,000 + 35% of amount > 3,600,000
 */
function calculateAnnualTax(annualTaxable) {
    const annual = Math.max(0, annualTaxable);
    let annualTax = 0;
    if (annual <= 600000) {
        annualTax = 0;
    }
    else if (annual <= 1200000) {
        annualTax = (annual - 600000) * 0.05;
    }
    else if (annual <= 2400000) {
        annualTax = 30000 + (annual - 1200000) * 0.15;
    }
    else if (annual <= 3600000) {
        annualTax = 210000 + (annual - 2400000) * 0.25;
    }
    else {
        annualTax = 510000 + (annual - 3600000) * 0.35;
    }
    const roundedAnnualTax = (0, money_js_1.round2)(annualTax);
    const monthlyTax = (0, money_js_1.round2)(roundedAnnualTax / 12);
    return {
        annualTaxable: (0, money_js_1.round2)(annual),
        annualTax: roundedAnnualTax,
        monthlyTax,
    };
}
/**
 * Calculates a complete single employee monthly payroll line snapshot.
 */
function calculatePayrollLine(input) {
    const basic = (0, money_js_1.round2)(input.basicSalary);
    const hraPct = input.hraPct ?? 40;
    const medicalPct = input.medicalPct ?? 10;
    const hra = (0, money_js_1.round2)(basic * (hraPct / 100));
    const medical = (0, money_js_1.round2)(basic * (medicalPct / 100));
    // Gross = 1.5 * basic (HRA 40% + medical 10% + basic 100% = 150%)
    const gross = (0, money_js_1.round2)(basic + hra + medical);
    const workingDays = input.workingDaysInMonth > 0 ? input.workingDaysInMonth : 1;
    const perDayRate = (0, money_js_1.round2)(gross / workingDays);
    const absentDays = Number(input.absentDays) || 0;
    const unpaidDays = Number(input.unpaidLeaveDays) || 0;
    const halfDays = Number(input.halfDays) || 0;
    const proratedDays = Number(input.proratedDeductionDays) || 0;
    // T10.2: 3 lates = 0.5 day deduction
    const lateCount = Number(input.lateCount) || 0;
    const latePenaltyDays = input.latePenaltyEnabled ? Math.floor(lateCount / 3) * 0.5 : 0;
    // Deduction days = absent + unpaid + 0.5 * halfDays + proratedDays + latePenaltyDays
    const deductionDays = (0, money_js_1.round2)(absentDays + unpaidDays + 0.5 * halfDays + proratedDays + latePenaltyDays);
    // Deduction amount = deduction days * per day rate
    const deductionAmount = (0, money_js_1.round2)(deductionDays * perDayRate);
    const tax = calculateAnnualTax(gross * 12);
    // Net = gross - deduction amount - monthly tax (never less than 0)
    const net = (0, money_js_1.round2)(Math.max(0, gross - deductionAmount - tax.monthlyTax));
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
