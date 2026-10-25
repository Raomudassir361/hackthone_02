import { Router } from 'express';
import { OrgController } from './org.controller.js';
import { authenticate, requireRole, mustChangePasswordGuard } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  updateSettingsSchema,
  departmentSchema,
  designationSchema,
  leaveTypeSchema,
  holidaySchema,
} from './org.schema.js';

export const orgRouter = Router();

// Settings
orgRouter.get(
  '/settings',
  authenticate,
  mustChangePasswordGuard,
  requireRole(['admin', 'hr']),
  OrgController.getSettings
);
orgRouter.put(
  '/settings',
  authenticate,
  mustChangePasswordGuard,
  requireRole(['admin']),
  validate(updateSettingsSchema),
  OrgController.updateSettings
);

// Departments
orgRouter.get(
  '/departments',
  authenticate,
  mustChangePasswordGuard,
  requireRole(['admin', 'hr']),
  OrgController.getDepartments
);
orgRouter.post(
  '/departments',
  authenticate,
  mustChangePasswordGuard,
  requireRole(['admin']),
  validate(departmentSchema),
  OrgController.createDepartment
);
orgRouter.put(
  '/departments/:id',
  authenticate,
  mustChangePasswordGuard,
  requireRole(['admin']),
  validate(departmentSchema),
  OrgController.updateDepartment
);
orgRouter.delete(
  '/departments/:id',
  authenticate,
  mustChangePasswordGuard,
  requireRole(['admin']),
  OrgController.deleteDepartment
);

// Designations
orgRouter.get(
  '/designations',
  authenticate,
  mustChangePasswordGuard,
  requireRole(['admin', 'hr']),
  OrgController.getDesignations
);
orgRouter.post(
  '/designations',
  authenticate,
  mustChangePasswordGuard,
  requireRole(['admin']),
  validate(designationSchema),
  OrgController.createDesignation
);

// Leave Types
orgRouter.get(
  '/leave-types',
  authenticate,
  mustChangePasswordGuard,
  requireRole(['admin', 'hr', 'employee']),
  OrgController.getLeaveTypes
);
orgRouter.post(
  '/leave-types',
  authenticate,
  mustChangePasswordGuard,
  requireRole(['admin']),
  validate(leaveTypeSchema),
  OrgController.createLeaveType
);

// Holidays
orgRouter.get(
  '/holidays',
  authenticate,
  mustChangePasswordGuard,
  requireRole(['admin', 'hr', 'employee']),
  OrgController.getHolidays
);
orgRouter.post(
  '/holidays',
  authenticate,
  mustChangePasswordGuard,
  requireRole(['admin']),
  validate(holidaySchema),
  OrgController.createHoliday
);
orgRouter.delete(
  '/holidays/:id',
  authenticate,
  mustChangePasswordGuard,
  requireRole(['admin']),
  OrgController.deleteHoliday
);
