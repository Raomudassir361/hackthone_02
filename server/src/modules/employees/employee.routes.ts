import { Router } from 'express';
import { EmployeeController } from './employee.controller.js';
import { authenticate, requireRole, mustChangePasswordGuard } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  updateProfileSchema,
  updateSalarySchema,
  getEmployeesQuerySchema,
  csvImportSchema,
} from './employee.schema.js';

export const employeeRouter = Router();
export const meRouter = Router();

// Apply auth to all employee endpoints
employeeRouter.use(authenticate);
employeeRouter.use(mustChangePasswordGuard);

// CSV Import & Export (must come before /:id routes)
employeeRouter.post(
  '/import',
  requireRole(['hr', 'admin']),
  validate(csvImportSchema),
  EmployeeController.importCsv
);

employeeRouter.get(
  '/export',
  requireRole(['hr', 'admin']),
  EmployeeController.exportCsv
);

// Employee Directory & CRUD
employeeRouter.get(
  '/',
  requireRole(['admin', 'hr', 'employee']),
  validate(getEmployeesQuerySchema),
  EmployeeController.getEmployees
);

employeeRouter.post(
  '/',
  requireRole(['hr', 'admin']),
  validate(createEmployeeSchema),
  EmployeeController.createEmployee
);

employeeRouter.get(
  '/:id',
  requireRole(['admin', 'hr', 'employee']),
  EmployeeController.getEmployeeById
);

employeeRouter.patch(
  '/:id',
  requireRole(['hr', 'admin']),
  validate(updateEmployeeSchema),
  EmployeeController.updateEmployee
);

// Salary Structure
employeeRouter.get(
  '/:id/salary',
  requireRole(['admin', 'hr', 'employee']),
  EmployeeController.getSalary
);

employeeRouter.put(
  '/:id/salary',
  requireRole(['hr']), // HR write only per F14
  validate(updateSalarySchema),
  EmployeeController.updateSalary
);

// Self-service profile editing (/api/me/profile)
meRouter.use(authenticate);
meRouter.use(mustChangePasswordGuard);
meRouter.patch('/profile', validate(updateProfileSchema), EmployeeController.updateOwnProfile);
