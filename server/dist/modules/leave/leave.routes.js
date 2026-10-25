"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveRouter = void 0;
const express_1 = require("express");
const leave_controller_js_1 = require("./leave.controller.js");
const auth_js_1 = require("../../middleware/auth.js");
const validate_js_1 = require("../../middleware/validate.js");
const leave_schema_js_1 = require("./leave.schema.js");
exports.leaveRouter = (0, express_1.Router)();
exports.leaveRouter.use(auth_js_1.authenticate);
exports.leaveRouter.use(auth_js_1.mustChangePasswordGuard);
// Live working-days preview
exports.leaveRouter.get('/preview', (0, validate_js_1.validate)(leave_schema_js_1.previewLeaveSchema), leave_controller_js_1.LeaveController.calculateWorkingDays);
// Leave balances
exports.leaveRouter.get('/balance', (0, auth_js_1.requireRole)(['employee', 'hr', 'admin']), leave_controller_js_1.LeaveController.getBalance);
// Apply for leave (HR and Employee)
exports.leaveRouter.post('/', (0, auth_js_1.requireRole)(['employee', 'hr']), (0, validate_js_1.validate)(leave_schema_js_1.applyLeaveSchema), leave_controller_js_1.LeaveController.applyLeave);
// Get leave history
exports.leaveRouter.get('/', (0, auth_js_1.requireRole)(['employee', 'hr', 'admin']), leave_controller_js_1.LeaveController.getLeaveRequests);
// HR/Admin Approval Inbox
exports.leaveRouter.get('/inbox', (0, auth_js_1.requireRole)(['hr', 'admin']), leave_controller_js_1.LeaveController.getLeaveInbox);
// Cancel pending request
exports.leaveRouter.post('/:id/cancel', (0, auth_js_1.requireRole)(['employee', 'hr', 'admin']), (0, validate_js_1.validate)(leave_schema_js_1.cancelLeaveSchema), leave_controller_js_1.LeaveController.cancelLeave);
// Decide on leave request (HR for employees; Admin for HR's own; no self-approval)
exports.leaveRouter.post('/:id/decide', (0, auth_js_1.requireRole)(['hr', 'admin']), (0, validate_js_1.validate)(leave_schema_js_1.decideLeaveSchema), leave_controller_js_1.LeaveController.decideLeave);
