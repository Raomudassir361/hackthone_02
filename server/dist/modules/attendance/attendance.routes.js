"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendanceRouter = void 0;
const express_1 = require("express");
const attendance_controller_js_1 = require("./attendance.controller.js");
const auth_js_1 = require("../../middleware/auth.js");
const validate_js_1 = require("../../middleware/validate.js");
const attendance_schema_js_1 = require("./attendance.schema.js");
exports.attendanceRouter = (0, express_1.Router)();
exports.attendanceRouter.use(auth_js_1.authenticate);
exports.attendanceRouter.use(auth_js_1.mustChangePasswordGuard);
// Check-in and Check-out (Employee & HR)
exports.attendanceRouter.post('/check-in', (0, auth_js_1.requireRole)(['employee', 'hr']), (0, validate_js_1.validate)(attendance_schema_js_1.checkInSchema), attendance_controller_js_1.AttendanceController.checkIn);
exports.attendanceRouter.post('/check-out', (0, auth_js_1.requireRole)(['employee', 'hr']), (0, validate_js_1.validate)(attendance_schema_js_1.checkOutSchema), attendance_controller_js_1.AttendanceController.checkOut);
// Calendar (own for Employee, any for HR/Admin)
exports.attendanceRouter.get('/calendar', (0, auth_js_1.requireRole)(['employee', 'hr', 'admin']), (0, validate_js_1.validate)(attendance_schema_js_1.calendarQuerySchema), attendance_controller_js_1.AttendanceController.getCalendar);
// Attendance Board (Admin & HR only)
exports.attendanceRouter.get('/board', (0, auth_js_1.requireRole)(['admin', 'hr']), (0, validate_js_1.validate)(attendance_schema_js_1.boardQuerySchema), attendance_controller_js_1.AttendanceController.getBoard);
// Attendance Corrections
exports.attendanceRouter.post('/corrections', (0, auth_js_1.requireRole)(['employee', 'hr']), (0, validate_js_1.validate)(attendance_schema_js_1.createCorrectionSchema), attendance_controller_js_1.AttendanceController.requestCorrection);
exports.attendanceRouter.get('/corrections', (0, auth_js_1.requireRole)(['employee', 'hr', 'admin']), attendance_controller_js_1.AttendanceController.getCorrections);
exports.attendanceRouter.post('/corrections/:id/decide', (0, auth_js_1.requireRole)(['hr', 'admin']), (0, validate_js_1.validate)(attendance_schema_js_1.decideCorrectionSchema), attendance_controller_js_1.AttendanceController.decideCorrection);
