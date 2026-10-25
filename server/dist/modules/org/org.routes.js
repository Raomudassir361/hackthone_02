"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orgRouter = void 0;
const express_1 = require("express");
const org_controller_js_1 = require("./org.controller.js");
const auth_js_1 = require("../../middleware/auth.js");
const validate_js_1 = require("../../middleware/validate.js");
const org_schema_js_1 = require("./org.schema.js");
exports.orgRouter = (0, express_1.Router)();
// Settings
exports.orgRouter.get('/settings', auth_js_1.authenticate, auth_js_1.mustChangePasswordGuard, (0, auth_js_1.requireRole)(['admin', 'hr']), org_controller_js_1.OrgController.getSettings);
exports.orgRouter.put('/settings', auth_js_1.authenticate, auth_js_1.mustChangePasswordGuard, (0, auth_js_1.requireRole)(['admin']), (0, validate_js_1.validate)(org_schema_js_1.updateSettingsSchema), org_controller_js_1.OrgController.updateSettings);
// Departments
exports.orgRouter.get('/departments', auth_js_1.authenticate, auth_js_1.mustChangePasswordGuard, (0, auth_js_1.requireRole)(['admin', 'hr']), org_controller_js_1.OrgController.getDepartments);
exports.orgRouter.post('/departments', auth_js_1.authenticate, auth_js_1.mustChangePasswordGuard, (0, auth_js_1.requireRole)(['admin']), (0, validate_js_1.validate)(org_schema_js_1.departmentSchema), org_controller_js_1.OrgController.createDepartment);
exports.orgRouter.put('/departments/:id', auth_js_1.authenticate, auth_js_1.mustChangePasswordGuard, (0, auth_js_1.requireRole)(['admin']), (0, validate_js_1.validate)(org_schema_js_1.departmentSchema), org_controller_js_1.OrgController.updateDepartment);
exports.orgRouter.delete('/departments/:id', auth_js_1.authenticate, auth_js_1.mustChangePasswordGuard, (0, auth_js_1.requireRole)(['admin']), org_controller_js_1.OrgController.deleteDepartment);
// Designations
exports.orgRouter.get('/designations', auth_js_1.authenticate, auth_js_1.mustChangePasswordGuard, (0, auth_js_1.requireRole)(['admin', 'hr']), org_controller_js_1.OrgController.getDesignations);
exports.orgRouter.post('/designations', auth_js_1.authenticate, auth_js_1.mustChangePasswordGuard, (0, auth_js_1.requireRole)(['admin']), (0, validate_js_1.validate)(org_schema_js_1.designationSchema), org_controller_js_1.OrgController.createDesignation);
// Leave Types
exports.orgRouter.get('/leave-types', auth_js_1.authenticate, auth_js_1.mustChangePasswordGuard, (0, auth_js_1.requireRole)(['admin', 'hr', 'employee']), org_controller_js_1.OrgController.getLeaveTypes);
exports.orgRouter.post('/leave-types', auth_js_1.authenticate, auth_js_1.mustChangePasswordGuard, (0, auth_js_1.requireRole)(['admin']), (0, validate_js_1.validate)(org_schema_js_1.leaveTypeSchema), org_controller_js_1.OrgController.createLeaveType);
// Holidays
exports.orgRouter.get('/holidays', auth_js_1.authenticate, auth_js_1.mustChangePasswordGuard, (0, auth_js_1.requireRole)(['admin', 'hr', 'employee']), org_controller_js_1.OrgController.getHolidays);
exports.orgRouter.post('/holidays', auth_js_1.authenticate, auth_js_1.mustChangePasswordGuard, (0, auth_js_1.requireRole)(['admin']), (0, validate_js_1.validate)(org_schema_js_1.holidaySchema), org_controller_js_1.OrgController.createHoliday);
exports.orgRouter.delete('/holidays/:id', auth_js_1.authenticate, auth_js_1.mustChangePasswordGuard, (0, auth_js_1.requireRole)(['admin']), org_controller_js_1.OrgController.deleteHoliday);
