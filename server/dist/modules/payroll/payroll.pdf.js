"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePayslipPdfStream = generatePayslipPdfStream;
const pdfkit_1 = __importDefault(require("pdfkit"));
const money_js_1 = require("../../shared/money.js");
function generatePayslipPdfStream(payslip, meta) {
    const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
    // Header / Branding
    doc
        .fillColor('#0F172A')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(meta.companyName, { align: 'left' });
    doc
        .fillColor('#64748B')
        .fontSize(10)
        .font('Helvetica')
        .text('HCM Lite — Confidential Payslip', { align: 'left' });
    doc.moveDown(1);
    doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1.5);
    // Summary / Meta Box
    const topY = doc.y;
    doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')
        .text('PAYSLIP DETAILS', 50, topY);
    doc
        .font('Helvetica')
        .fillColor('#475569')
        .text(`Pay Period: ${meta.month}`, 50, topY + 16)
        .text(`Generated Date: ${meta.generatedDate}`, 50, topY + 30);
    doc
        .font('Helvetica-Bold')
        .fillColor('#0F172A')
        .text('EMPLOYEE DETAILS', 320, topY);
    doc
        .font('Helvetica')
        .fillColor('#475569')
        .text(`Name: ${payslip.employeeName}`, 320, topY + 16)
        .text(`Employee Code: ${payslip.employeeCode}`, 320, topY + 30)
        .text(`Department: ${payslip.departmentName || 'N/A'}`, 320, topY + 44)
        .text(`Designation: ${payslip.designationTitle || 'N/A'}`, 320, topY + 58);
    doc.moveDown(4.5);
    doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1.5);
    // Attendance & Days Breakdown
    const tableStartY = doc.y;
    doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#0F172A')
        .text('ATTENDANCE BREAKDOWN', 50, tableStartY);
    doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#475569')
        .text(`Working Days in Month: ${payslip.workingDays}`, 50, tableStartY + 18)
        .text(`Absent Days: ${payslip.absentDays}`, 180, tableStartY + 18)
        .text(`Unpaid Leave Days: ${payslip.unpaidDays}`, 280, tableStartY + 18)
        .text(`Half Days: ${payslip.halfDays}`, 400, tableStartY + 18)
        .text(`Total Deduction Days: ${payslip.deductionDays}`, 480, tableStartY + 18);
    doc.moveDown(2.5);
    // Earnings & Deductions Table
    const gridY = doc.y;
    // Left Column: Earnings
    doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#1E3A8A')
        .text('EARNINGS', 50, gridY);
    doc.font('Helvetica').fontSize(10).fillColor('#334155');
    doc.text('Basic Salary:', 50, gridY + 20).text((0, money_js_1.formatPKR)(payslip.basic), 200, gridY + 20, { align: 'right' });
    doc.text('House Rent Allowance (HRA):', 50, gridY + 36).text((0, money_js_1.formatPKR)(payslip.hra), 200, gridY + 36, { align: 'right' });
    doc.text('Medical Allowance:', 50, gridY + 52).text((0, money_js_1.formatPKR)(payslip.medical), 200, gridY + 52, { align: 'right' });
    doc.font('Helvetica-Bold').fillColor('#0F172A');
    doc.text('Total Gross Salary:', 50, gridY + 74).text((0, money_js_1.formatPKR)(payslip.gross), 200, gridY + 74, { align: 'right' });
    // Right Column: Deductions
    doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#B91C1C')
        .text('DEDUCTIONS & TAX', 320, gridY);
    doc.font('Helvetica').fontSize(10).fillColor('#334155');
    doc.text('Attendance Deductions:', 320, gridY + 20).text((0, money_js_1.formatPKR)(payslip.deductionAmount), 495, gridY + 20, { align: 'right' });
    doc.text('Income Tax (Monthly):', 320, gridY + 36).text((0, money_js_1.formatPKR)(payslip.monthlyTax), 495, gridY + 36, { align: 'right' });
    const totalDeductions = payslip.deductionAmount + payslip.monthlyTax;
    doc.font('Helvetica-Bold').fillColor('#0F172A');
    doc.text('Total Deductions:', 320, gridY + 74).text((0, money_js_1.formatPKR)(totalDeductions), 495, gridY + 74, { align: 'right' });
    doc.moveDown(5);
    doc.strokeColor('#CBD5E1').lineWidth(1.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1.5);
    // Net Pay Highlight Box
    const netBoxY = doc.y;
    doc
        .rect(50, netBoxY, 495, 45)
        .fill('#F0FDF4');
    doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor('#166534')
        .text('NET SALARY PAYABLE:', 70, netBoxY + 16);
    doc
        .font('Helvetica-Bold')
        .fontSize(15)
        .fillColor('#15803D')
        .text((0, money_js_1.formatPKR)(payslip.net), 320, netBoxY + 15, { align: 'right', width: 200 });
    // Footer Note
    doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#94A3B8')
        .text('This document is computer generated by HCM Lite and carries legal payroll validity without physical signature.', 50, 760, { align: 'center', width: 495 });
    return doc;
}
