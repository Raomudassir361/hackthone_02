import mongoose, { Schema, Document } from 'mongoose';

export interface IPayslipLine {
  employeeId: mongoose.Types.ObjectId;
  employeeCode: string;
  employeeName: string;
  departmentName?: string;
  designationTitle?: string;
  basic: number;
  hra: number;
  medical: number;
  gross: number;
  workingDays: number;
  perDayRate: number;
  absentDays: number;
  unpaidDays: number;
  halfDays: number;
  deductionDays: number;
  deductionAmount: number;
  annualTaxable: number;
  annualTax: number;
  monthlyTax: number;
  net: number;
}

export interface IPayrollTotals {
  gross: number;
  deductions: number;
  tax: number;
  net: number;
  employeeCount: number;
}

export interface IPayrollRun extends Document {
  month: string; // YYYY-MM
  status: 'draft' | 'finalized';
  createdBy: mongoose.Types.ObjectId;
  finalizedBy?: mongoose.Types.ObjectId;
  finalizedAt?: Date;
  totals: IPayrollTotals;
  lines: IPayslipLine[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IPayslip extends Document {
  runId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  month: string;
  basic: number;
  hra: number;
  medical: number;
  gross: number;
  workingDays: number;
  absentDays: number;
  unpaidDays: number;
  halfDays: number;
  deductionDays: number;
  deductionAmount: number;
  annualTaxable: number;
  monthlyTax: number;
  net: number;
  createdAt: Date;
  updatedAt: Date;
}

const PayslipLineSchema = new Schema<IPayslipLine>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeCode: { type: String, required: true },
    employeeName: { type: String, required: true },
    departmentName: { type: String },
    designationTitle: { type: String },
    basic: { type: Number, required: true },
    hra: { type: Number, required: true },
    medical: { type: Number, required: true },
    gross: { type: Number, required: true },
    workingDays: { type: Number, required: true },
    perDayRate: { type: Number, required: true },
    absentDays: { type: Number, default: 0 },
    unpaidDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    deductionDays: { type: Number, default: 0 },
    deductionAmount: { type: Number, default: 0 },
    annualTaxable: { type: Number, default: 0 },
    annualTax: { type: Number, default: 0 },
    monthlyTax: { type: Number, default: 0 },
    net: { type: Number, required: true },
  },
  { _id: true }
);

const PayrollRunSchema = new Schema<IPayrollRun>(
  {
    month: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['draft', 'finalized'], default: 'draft', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    finalizedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    finalizedAt: { type: Date },
    totals: {
      gross: { type: Number, required: true, default: 0 },
      deductions: { type: Number, required: true, default: 0 },
      tax: { type: Number, required: true, default: 0 },
      net: { type: Number, required: true, default: 0 },
      employeeCount: { type: Number, required: true, default: 0 },
    },
    lines: [PayslipLineSchema],
  },
  { timestamps: true }
);

const PayslipSchema = new Schema<IPayslip>(
  {
    runId: { type: Schema.Types.ObjectId, ref: 'PayrollRun', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    month: { type: String, required: true, index: true },
    basic: { type: Number, required: true },
    hra: { type: Number, required: true },
    medical: { type: Number, required: true },
    gross: { type: Number, required: true },
    workingDays: { type: Number, required: true },
    absentDays: { type: Number, required: true, default: 0 },
    unpaidDays: { type: Number, required: true, default: 0 },
    halfDays: { type: Number, required: true, default: 0 },
    deductionDays: { type: Number, required: true, default: 0 },
    deductionAmount: { type: Number, required: true, default: 0 },
    annualTaxable: { type: Number, required: true, default: 0 },
    monthlyTax: { type: Number, required: true, default: 0 },
    net: { type: Number, required: true },
  },
  { timestamps: true }
);

PayslipSchema.index({ runId: 1, employeeId: 1 }, { unique: true });
PayslipSchema.index({ employeeId: 1, month: -1 });

export const PayrollRunModel = mongoose.model<IPayrollRun>('PayrollRun', PayrollRunSchema, 'payroll_runs');
export const PayslipModel = mongoose.model<IPayslip>('Payslip', PayslipSchema, 'payslips');
