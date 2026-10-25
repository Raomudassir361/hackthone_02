import { Router } from 'express';
import { LeaveController } from './leave.controller.js';
import { authenticate, requireRole, mustChangePasswordGuard } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  applyLeaveSchema,
  previewLeaveSchema,
  decideLeaveSchema,
  cancelLeaveSchema,
} from './leave.schema.js';

export const leaveRouter = Router();

leaveRouter.use(authenticate);
leaveRouter.use(mustChangePasswordGuard);

// Live working-days preview
leaveRouter.get('/preview', validate(previewLeaveSchema), LeaveController.calculateWorkingDays);

// Leave balances
leaveRouter.get(
  '/balance',
  requireRole(['employee', 'hr', 'admin']),
  LeaveController.getBalance
);

// Apply for leave (HR and Employee)
leaveRouter.post(
  '/',
  requireRole(['employee', 'hr']),
  validate(applyLeaveSchema),
  LeaveController.applyLeave
);

// Get leave history
leaveRouter.get(
  '/',
  requireRole(['employee', 'hr', 'admin']),
  LeaveController.getLeaveRequests
);

// HR/Admin Approval Inbox
leaveRouter.get(
  '/inbox',
  requireRole(['hr', 'admin']),
  LeaveController.getLeaveInbox
);

// Cancel pending request
leaveRouter.post(
  '/:id/cancel',
  requireRole(['employee', 'hr', 'admin']),
  validate(cancelLeaveSchema),
  LeaveController.cancelLeave
);

// Decide on leave request (HR for employees; Admin for HR's own; no self-approval)
leaveRouter.post(
  '/:id/decide',
  requireRole(['hr', 'admin']),
  validate(decideLeaveSchema),
  LeaveController.decideLeave
);
