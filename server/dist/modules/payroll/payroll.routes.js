"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payslipRouter = exports.payrollRouter = void 0;
const express_1 = require("express");
const payroll_controller_js_1 = require("./payroll.controller.js");
const auth_js_1 = require("../../middleware/auth.js");
const validate_js_1 = require("../../middleware/validate.js");
const payroll_schema_js_1 = require("./payroll.schema.js");
exports.payrollRouter = (0, express_1.Router)();
// Base middleware for all payroll routes
exports.payrollRouter.use(auth_js_1.authenticate, auth_js_1.mustChangePasswordGuard);
// 1. POST /api/payroll/runs (HR creates draft)
exports.payrollRouter.post('/runs', (0, auth_js_1.requireRole)(['admin', 'hr']), (0, validate_js_1.validate)(payroll_schema_js_1.CreatePayrollRunSchema), payroll_controller_js_1.PayrollController.createDraftRun);
// 2. GET /api/payroll/runs (List runs)
exports.payrollRouter.get('/runs', (0, auth_js_1.requireRole)(['admin', 'hr']), payroll_controller_js_1.PayrollController.getRuns);
// 3. GET /api/payroll/runs/:id (Run details with lines)
exports.payrollRouter.get('/runs/:id', (0, auth_js_1.requireRole)(['admin', 'hr']), payroll_controller_js_1.PayrollController.getRunById);
// 4. POST /api/payroll/runs/:id/regenerate (Draft only)
exports.payrollRouter.post('/runs/:id/regenerate', (0, auth_js_1.requireRole)(['admin', 'hr']), payroll_controller_js_1.PayrollController.regenerateDraftRun);
// 5. POST /api/payroll/runs/:id/finalize (Admin ONLY)
exports.payrollRouter.post('/runs/:id/finalize', (0, auth_js_1.requireRole)(['admin']), payroll_controller_js_1.PayrollController.finalizeRun);
// Payslip routes (scoped to employee or accessible to admin/hr)
exports.payslipRouter = (0, express_1.Router)();
exports.payslipRouter.use(auth_js_1.authenticate, auth_js_1.mustChangePasswordGuard);
exports.payslipRouter.get('/', payroll_controller_js_1.PayrollController.getPayslips);
exports.payslipRouter.get('/:id/pdf', payroll_controller_js_1.PayrollController.getPayslipPdf);
