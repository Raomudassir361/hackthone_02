"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayslipModel = exports.PayrollRunModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const PayslipLineSchema = new mongoose_1.Schema({
    employeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
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
}, { _id: true });
const PayrollRunSchema = new mongoose_1.Schema({
    month: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['draft', 'finalized'], default: 'draft', index: true },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    finalizedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    finalizedAt: { type: Date },
    totals: {
        gross: { type: Number, required: true, default: 0 },
        deductions: { type: Number, required: true, default: 0 },
        tax: { type: Number, required: true, default: 0 },
        net: { type: Number, required: true, default: 0 },
        employeeCount: { type: Number, required: true, default: 0 },
    },
    lines: [PayslipLineSchema],
}, { timestamps: true });
const PayslipSchema = new mongoose_1.Schema({
    runId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'PayrollRun', required: true, index: true },
    employeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
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
}, { timestamps: true });
PayslipSchema.index({ runId: 1, employeeId: 1 }, { unique: true });
PayslipSchema.index({ employeeId: 1, month: -1 });
exports.PayrollRunModel = mongoose_1.default.model('PayrollRun', PayrollRunSchema, 'payroll_runs');
exports.PayslipModel = mongoose_1.default.model('Payslip', PayslipSchema, 'payslips');
