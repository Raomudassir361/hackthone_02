import { Router } from 'express';
import { PayrollController } from './payroll.controller.js';
import { authenticate, requireRole, mustChangePasswordGuard } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { CreatePayrollRunSchema } from './payroll.schema.js';

export const payrollRouter = Router();

// Base middleware for all payroll routes
payrollRouter.use(authenticate, mustChangePasswordGuard);

// 1. POST /api/payroll/runs (HR creates draft)
payrollRouter.post(
  '/runs',
  requireRole(['admin', 'hr']),
  validate(CreatePayrollRunSchema),
  PayrollController.createDraftRun
);

// 2. GET /api/payroll/runs (List runs)
payrollRouter.get('/runs', requireRole(['admin', 'hr']), PayrollController.getRuns);

// 3. GET /api/payroll/runs/:id (Run details with lines)
payrollRouter.get('/runs/:id', requireRole(['admin', 'hr']), PayrollController.getRunById);

// 4. POST /api/payroll/runs/:id/regenerate (Draft only)
payrollRouter.post(
  '/runs/:id/regenerate',
  requireRole(['admin', 'hr']),
  PayrollController.regenerateDraftRun
);

// 5. POST /api/payroll/runs/:id/finalize (Admin ONLY)
payrollRouter.post(
  '/runs/:id/finalize',
  requireRole(['admin']),
  PayrollController.finalizeRun
);

// Payslip routes (scoped to employee or accessible to admin/hr)
export const payslipRouter = Router();
payslipRouter.use(authenticate, mustChangePasswordGuard);

payslipRouter.get('/', PayrollController.getPayslips);
payslipRouter.get('/:id/pdf', PayrollController.getPayslipPdf);
