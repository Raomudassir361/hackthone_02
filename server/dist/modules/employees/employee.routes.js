"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meRouter = exports.employeeRouter = void 0;
const express_1 = require("express");
const employee_controller_js_1 = require("./employee.controller.js");
const auth_js_1 = require("../../middleware/auth.js");
const validate_js_1 = require("../../middleware/validate.js");
const employee_schema_js_1 = require("./employee.schema.js");
exports.employeeRouter = (0, express_1.Router)();
exports.meRouter = (0, express_1.Router)();
// Apply auth to all employee endpoints
exports.employeeRouter.use(auth_js_1.authenticate);
exports.employeeRouter.use(auth_js_1.mustChangePasswordGuard);
// CSV Import & Export (must come before /:id routes)
exports.employeeRouter.post('/import', (0, auth_js_1.requireRole)(['hr', 'admin']), (0, validate_js_1.validate)(employee_schema_js_1.csvImportSchema), employee_controller_js_1.EmployeeController.importCsv);
exports.employeeRouter.get('/export', (0, auth_js_1.requireRole)(['hr', 'admin']), employee_controller_js_1.EmployeeController.exportCsv);
// Employee Directory & CRUD
exports.employeeRouter.get('/', (0, auth_js_1.requireRole)(['admin', 'hr', 'employee']), (0, validate_js_1.validate)(employee_schema_js_1.getEmployeesQuerySchema), employee_controller_js_1.EmployeeController.getEmployees);
exports.employeeRouter.post('/', (0, auth_js_1.requireRole)(['hr', 'admin']), (0, validate_js_1.validate)(employee_schema_js_1.createEmployeeSchema), employee_controller_js_1.EmployeeController.createEmployee);
exports.employeeRouter.get('/:id', (0, auth_js_1.requireRole)(['admin', 'hr', 'employee']), employee_controller_js_1.EmployeeController.getEmployeeById);
exports.employeeRouter.patch('/:id', (0, auth_js_1.requireRole)(['hr', 'admin']), (0, validate_js_1.validate)(employee_schema_js_1.updateEmployeeSchema), employee_controller_js_1.EmployeeController.updateEmployee);
// Salary Structure
exports.employeeRouter.get('/:id/salary', (0, auth_js_1.requireRole)(['admin', 'hr', 'employee']), employee_controller_js_1.EmployeeController.getSalary);
exports.employeeRouter.put('/:id/salary', (0, auth_js_1.requireRole)(['hr']), // HR write only per F14
(0, validate_js_1.validate)(employee_schema_js_1.updateSalarySchema), employee_controller_js_1.EmployeeController.updateSalary);
// Self-service profile editing (/api/me/profile)
exports.meRouter.use(auth_js_1.authenticate);
exports.meRouter.use(auth_js_1.mustChangePasswordGuard);
exports.meRouter.patch('/profile', (0, validate_js_1.validate)(employee_schema_js_1.updateProfileSchema), employee_controller_js_1.EmployeeController.updateOwnProfile);
