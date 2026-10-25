import { Router } from 'express';
import { AttendanceController } from './attendance.controller.js';
import { authenticate, requireRole, mustChangePasswordGuard } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  checkInSchema,
  checkOutSchema,
  calendarQuerySchema,
  boardQuerySchema,
  createCorrectionSchema,
  decideCorrectionSchema,
} from './attendance.schema.js';

export const attendanceRouter = Router();

attendanceRouter.use(authenticate);
attendanceRouter.use(mustChangePasswordGuard);

// Check-in and Check-out (Employee & HR)
attendanceRouter.post(
  '/check-in',
  requireRole(['employee', 'hr']),
  validate(checkInSchema),
  AttendanceController.checkIn
);

attendanceRouter.post(
  '/check-out',
  requireRole(['employee', 'hr']),
  validate(checkOutSchema),
  AttendanceController.checkOut
);

// Calendar (own for Employee, any for HR/Admin)
attendanceRouter.get(
  '/calendar',
  requireRole(['employee', 'hr', 'admin']),
  validate(calendarQuerySchema),
  AttendanceController.getCalendar
);

// Attendance Board (Admin & HR only)
attendanceRouter.get(
  '/board',
  requireRole(['admin', 'hr']),
  validate(boardQuerySchema),
  AttendanceController.getBoard
);

// Attendance Corrections
attendanceRouter.post(
  '/corrections',
  requireRole(['employee', 'hr']),
  validate(createCorrectionSchema),
  AttendanceController.requestCorrection
);

attendanceRouter.get(
  '/corrections',
  requireRole(['employee', 'hr', 'admin']),
  AttendanceController.getCorrections
);

attendanceRouter.post(
  '/corrections/:id/decide',
  requireRole(['hr', 'admin']),
  validate(decideCorrectionSchema),
  AttendanceController.decideCorrection
);
