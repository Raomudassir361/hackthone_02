import mongoose from 'mongoose';
import { AppError } from '../../shared/errors.js';
import { AttendanceModel, AttendanceCorrectionModel, IAttendance } from './attendance.model.js';
import { SettingsModel, HolidayModel } from '../org/org.model.js';
import { EmployeeModel } from '../employees/employee.model.js';
import { UserModel } from '../auth/user.model.js';
import { AuditService } from '../audit/audit.service.js';
import { RequestContext } from '../../middleware/auth.js';
import { getCompanyTodayString, parseISODateOnly } from '../../shared/dates.js';
import { isWorkingDay } from '../../shared/workingDays.js';
import { calculateDistanceMeters } from '../../shared/haversine.js';
import {
  isCheckInLate,
  calculateWorkedMinutes,
  determineAttendanceStatus,
  RuleSnapshot,
} from './status.js';
import {
  CheckInInput,
  CheckOutInput,
  CreateCorrectionInput,
  DecideCorrectionInput,
} from './attendance.schema.js';

export class AttendanceService {
  /**
   * Helper: Resolves employee ID for current request context.
   */
  private static getTargetEmployeeId(ctx: RequestContext, requestedId?: string): string {
    if (ctx.role === 'employee') {
      if (!ctx.employeeId) {
        throw new AppError('NOT_FOUND', 404, 'No employee record linked to user account');
      }
      return ctx.employeeId;
    }
    return requestedId || ctx.employeeId || '';
  }

  /**
   * POST /api/attendance/check-in (F09)
   * Server stamps time; second check-in returns 409 Conflict.
   */
  public static async checkIn(ctx: RequestContext, input: CheckInInput, ip?: string) {
    const employeeId = this.getTargetEmployeeId(ctx);
    if (!employeeId) {
      throw new AppError('BAD_REQUEST', 400, 'Employee ID is required for check-in');
    }

    const employee = await EmployeeModel.findById(employeeId);
    if (!employee) {
      throw new AppError('NOT_FOUND', 404, 'Employee not found');
    }

    const settings = await SettingsModel.findOne();
    const timezone = settings?.timezone || 'Asia/Karachi';
    const serverNow = new Date();
    const companyToday = getCompanyTodayString(timezone, serverNow);

    // Guard duplicate: unique (employeeId, date)
    const existing = await AttendanceModel.findOne({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      date: companyToday,
    });
    if (existing) {
      throw new AppError('DUPLICATE_CHECK_IN', 409, 'You have already checked in today');
    }

    // Capture Rule Snapshot
    const ruleSnapshot: RuleSnapshot = {
      officeStart: settings?.officeStart || '09:00',
      graceMinutes: settings?.graceMinutes !== undefined ? settings.graceMinutes : 15,
      halfDayHours: settings?.halfDayHours !== undefined ? settings.halfDayHours : 5,
    };

    // Evaluate Late
    const isLate = isCheckInLate(serverNow, ruleSnapshot, timezone);

    // Evaluate Working Day
    const holidays = await HolidayModel.find().select('date');
    const holidayDates = holidays.map((h) => h.date);
    const weekendDays = settings?.weekendDays || [0, 6];
    const workingDay = isWorkingDay(companyToday, weekendDays, holidayDates);

    // Geolocation verification (optional advisory)
    let locationData: { lat: number; lng: number; distanceMeters?: number } | undefined;
    if (input.lat !== undefined && input.lng !== undefined && settings?.officeLat && settings?.officeLng) {
      const dist = calculateDistanceMeters(input.lat, input.lng, settings.officeLat, settings.officeLng);
      locationData = {
        lat: input.lat,
        lng: input.lng,
        distanceMeters: dist,
      };
    }

    const record = await AttendanceModel.create({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      date: companyToday,
      checkInAt: serverNow,
      status: isLate ? 'late' : 'present',
      workedMinutes: 0,
      source: 'web',
      isWorkingDay: workingDay,
      ruleSnapshot,
      location: locationData,
    });

    await AuditService.log({
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: 'CHECK_IN',
      entity: 'attendance',
      entityId: record._id.toString(),
      after: {
        date: record.date,
        checkInAt: record.checkInAt,
        status: record.status,
        isWorkingDay: record.isWorkingDay,
      },
      ip,
    });

    return record;
  }

  /**
   * POST /api/attendance/check-out (F09)
   * Computes workedMinutes and sets half_day if worked < halfDayHours
   */
  public static async checkOut(ctx: RequestContext, input: CheckOutInput, ip?: string) {
    const employeeId = this.getTargetEmployeeId(ctx);
    if (!employeeId) {
      throw new AppError('BAD_REQUEST', 400, 'Employee ID is required for check-out');
    }

    const settings = await SettingsModel.findOne();
    const timezone = settings?.timezone || 'Asia/Karachi';
    const serverNow = new Date();
    const companyToday = getCompanyTodayString(timezone, serverNow);

    const record = await AttendanceModel.findOne({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      date: companyToday,
    });

    if (!record) {
      throw new AppError('NOT_FOUND', 404, 'No check-in record found for today');
    }

    if (record.checkOutAt) {
      throw new AppError('BAD_REQUEST', 400, 'You have already checked out today');
    }

    record.checkOutAt = serverNow;
    record.workedMinutes = calculateWorkedMinutes(record.checkInAt, serverNow);

    const isLate = record.status === 'late';
    record.status = determineAttendanceStatus({
      isLate,
      hasCheckedOut: true,
      workedMinutes: record.workedMinutes,
      halfDayHours: record.ruleSnapshot.halfDayHours,
    });

    if (input.lat !== undefined && input.lng !== undefined && settings?.officeLat && settings?.officeLng) {
      const dist = calculateDistanceMeters(input.lat, input.lng, settings.officeLat, settings.officeLng);
      record.location = {
        lat: input.lat,
        lng: input.lng,
        distanceMeters: dist,
      };
    }

    await record.save();

    await AuditService.log({
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: 'CHECK_OUT',
      entity: 'attendance',
      entityId: record._id.toString(),
      after: {
        checkOutAt: record.checkOutAt,
        workedMinutes: record.workedMinutes,
        status: record.status,
      },
      ip,
    });

    return record;
  }

  /**
   * GET /api/attendance/calendar?month=YYYY-MM (F10)
   * Own calendar for employee, any for Admin/HR. Derives absent, weekend, holiday.
   */
  public static async getCalendar(ctx: RequestContext, month: string, targetEmpId?: string) {
    const employeeId = this.getTargetEmployeeId(ctx, targetEmpId);
    if (!employeeId) {
      throw new AppError('BAD_REQUEST', 400, 'Employee ID is required');
    }

    // Role check: Employee can only see own calendar
    if (ctx.role === 'employee' && employeeId !== ctx.employeeId) {
      throw new AppError('NOT_FOUND', 404, 'Calendar not found');
    }

    const employee = await EmployeeModel.findById(employeeId);
    if (!employee) {
      throw new AppError('NOT_FOUND', 404, 'Employee not found');
    }

    const settings = await SettingsModel.findOne();
    const weekendDays = settings?.weekendDays || [0, 6];
    const holidays = await HolidayModel.find().select('date name');
    const holidayMap = new Map<string, string>();
    holidays.forEach((h) => holidayMap.set(h.date, h.name));

    // Fetch existing attendance records for the month
    const regex = new RegExp(`^${month}-\\d{2}$`);
    const records = await AttendanceModel.find({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      date: { $regex: regex },
    }).lean();

    const recordMap = new Map<string, IAttendance>();
    records.forEach((r) => recordMap.set(r.date, r as unknown as IAttendance));

    // Build day-by-day calendar array
    const [yearStr, monthStr] = month.split('-');
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1; // 0-based

    const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    const todayStr = getCompanyTodayString(settings?.timezone || 'Asia/Karachi');

    const calendarDays = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = parseISODateOnly(dateStr);
      const dayOfWeek = dateObj.getUTCDay();
      const isWeekend = weekendDays.includes(dayOfWeek);
      const holidayName = holidayMap.get(dateStr);
      const isHoliday = Boolean(holidayName);

      const record = recordMap.get(dateStr);

      let derivedStatus: string;
      if (record) {
        // If it's a past day and no checkout was recorded
        if (!record.checkOutAt && dateStr < todayStr) {
          derivedStatus = 'missing_checkout';
        } else {
          derivedStatus = record.status;
        }
      } else if (isHoliday) {
        derivedStatus = 'holiday';
      } else if (isWeekend) {
        derivedStatus = 'weekend';
      } else if (dateStr < todayStr && dateStr >= employee.joinDate) {
        // Past working day after join date without record -> absent
        derivedStatus = 'absent';
      } else {
        derivedStatus = 'future';
      }

      calendarDays.push({
        date: dateStr,
        dayOfWeek,
        isWeekend,
        isHoliday,
        holidayName,
        status: derivedStatus,
        checkInAt: record?.checkInAt,
        checkOutAt: record?.checkOutAt,
        workedMinutes: record?.workedMinutes,
        source: record?.source,
      });
    }

    return {
      month,
      employee: {
        id: employee._id.toString(),
        name: employee.name,
        code: employee.code,
      },
      days: calendarDays,
    };
  }

  /**
   * GET /api/attendance/board?date=YYYY-MM-DD (F10)
   * Daily attendance board for HR and Admin.
   */
  public static async getBoard(ctx: RequestContext, date: string, departmentId?: string) {
    const filter: Record<string, unknown> = { status: { $ne: 'exited' } };
    if (departmentId) {
      filter.departmentId = new mongoose.Types.ObjectId(departmentId);
    }

    const employees = await EmployeeModel.find(filter)
      .populate('departmentId', 'name')
      .populate('designationId', 'title')
      .sort({ code: 1 })
      .lean();

    const empIds = employees.map((e) => e._id);

    const records = await AttendanceModel.find({
      employeeId: { $in: empIds },
      date,
    }).lean();

    const recordMap = new Map<string, IAttendance>();
    records.forEach((r) => recordMap.set(r.employeeId.toString(), r as unknown as IAttendance));

    const settings = await SettingsModel.findOne();
    const holidays = await HolidayModel.find().select('date name');
    const holidayMap = new Map<string, string>();
    holidays.forEach((h) => holidayMap.set(h.date, h.name));

    const dateObj = parseISODateOnly(date);
    const dayOfWeek = dateObj.getUTCDay();
    const isWeekend = (settings?.weekendDays || [0, 6]).includes(dayOfWeek);
    const holidayName = holidayMap.get(date);
    const isHoliday = Boolean(holidayName);
    const todayStr = getCompanyTodayString(settings?.timezone || 'Asia/Karachi');

    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;

    const rows = employees.map((emp) => {
      const record = recordMap.get(emp._id.toString());
      let status: string;

      if (record) {
        if (!record.checkOutAt && date < todayStr) {
          status = 'missing_checkout';
        } else {
          status = record.status;
        }

        if (status === 'present') presentCount++;
        else if (status === 'late') lateCount++;
        else if (status === 'half_day') halfDayCount++;
      } else if (isHoliday) {
        status = 'holiday';
      } else if (isWeekend) {
        status = 'weekend';
      } else if (date < todayStr && date >= emp.joinDate) {
        status = 'absent';
        absentCount++;
      } else {
        status = 'not_checked_in';
      }

      return {
        employee: {
          id: emp._id.toString(),
          code: emp.code,
          name: emp.name,
          department: (emp.departmentId as { name?: string })?.name || '—',
          designation: (emp.designationId as { title?: string })?.title || '—',
        },
        date,
        status,
        checkInAt: record?.checkInAt,
        checkOutAt: record?.checkOutAt,
        workedMinutes: record?.workedMinutes,
        source: record?.source,
      };
    });

    return {
      date,
      summary: {
        totalEmployees: employees.length,
        present: presentCount,
        late: lateCount,
        halfDay: halfDayCount,
        absent: absentCount,
        isWeekend,
        isHoliday,
        holidayName,
      },
      rows,
    };
  }

  /**
   * Request attendance correction (F11)
   */
  public static async requestCorrection(
    ctx: RequestContext,
    input: CreateCorrectionInput,
    ip?: string
  ) {
    const employeeId = this.getTargetEmployeeId(ctx);
    if (!employeeId) {
      throw new AppError('BAD_REQUEST', 400, 'Employee ID is required');
    }

    const correction = await AttendanceCorrectionModel.create({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      date: input.date,
      requestedCheckIn: input.requestedCheckIn ? new Date(input.requestedCheckIn) : undefined,
      requestedCheckOut: input.requestedCheckOut ? new Date(input.requestedCheckOut) : undefined,
      reason: input.reason,
      status: 'pending',
    });

    await AuditService.log({
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: 'REQUEST_ATTENDANCE_CORRECTION',
      entity: 'attendance_corrections',
      entityId: correction._id.toString(),
      after: { date: input.date, reason: input.reason },
      ip,
    });

    return correction;
  }

  /**
   * List corrections
   */
  public static async getCorrections(ctx: RequestContext, status = 'pending') {
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    if (ctx.role === 'employee') {
      filter.employeeId = new mongoose.Types.ObjectId(ctx.employeeId);
    }

    const items = await AttendanceCorrectionModel.find(filter)
      .populate('employeeId', 'name code')
      .populate('decidedBy', 'email')
      .sort({ createdAt: -1 });

    return items;
  }

  /**
   * Decide correction (HR decides for Employee; Admin decides for HR; no self-approval)
   */
  public static async decideCorrection(
    ctx: RequestContext,
    id: string,
    input: DecideCorrectionInput,
    ip?: string
  ) {
    const correction = await AttendanceCorrectionModel.findById(id);
    if (!correction) {
      throw new AppError('NOT_FOUND', 404, 'Correction request not found');
    }

    if (correction.status !== 'pending') {
      throw new AppError('BAD_REQUEST', 400, 'Correction has already been decided');
    }

    // Rule: No self-approval
    if (ctx.employeeId && correction.employeeId.toString() === ctx.employeeId) {
      throw new AppError('FORBIDDEN', 403, 'Self-approval is forbidden');
    }

    // Rule: HR's own items decided by Admin
    const empUser = await UserModel.findOne({ employeeId: correction.employeeId });
    if (empUser?.role === 'hr' && ctx.role !== 'admin') {
      throw new AppError('FORBIDDEN', 403, 'HR corrections can only be decided by Admin');
    }

    correction.status = input.status;
    correction.decidedBy = new mongoose.Types.ObjectId(ctx.userId);
    correction.decisionComment = input.decisionComment;
    correction.decidedAt = new Date();
    await correction.save();

    // If approved, update or insert attendance record with source = 'correction'
    if (input.status === 'approved') {
      const settings = await SettingsModel.findOne();
      const ruleSnapshot: RuleSnapshot = {
        officeStart: settings?.officeStart || '09:00',
        graceMinutes: settings?.graceMinutes !== undefined ? settings.graceMinutes : 15,
        halfDayHours: settings?.halfDayHours !== undefined ? settings.halfDayHours : 5,
      };

      const checkIn = correction.requestedCheckIn || new Date(`${correction.date}T09:00:00.000Z`);
      const checkOut = correction.requestedCheckOut;
      const worked = calculateWorkedMinutes(checkIn, checkOut);
      const isLate = isCheckInLate(checkIn, ruleSnapshot, settings?.timezone || 'Asia/Karachi');

      const status = determineAttendanceStatus({
        isLate,
        hasCheckedOut: Boolean(checkOut),
        workedMinutes: worked,
        halfDayHours: ruleSnapshot.halfDayHours,
      });

      await AttendanceModel.findOneAndUpdate(
        { employeeId: correction.employeeId, date: correction.date },
        {
          $set: {
            checkInAt: checkIn,
            checkOutAt: checkOut,
            workedMinutes: worked,
            status,
            source: 'correction',
            correctionId: correction._id,
            ruleSnapshot,
          },
        },
        { upsert: true, new: true }
      );
    }

    await AuditService.log({
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: 'DECIDE_ATTENDANCE_CORRECTION',
      entity: 'attendance_corrections',
      entityId: id,
      after: { status: input.status, comment: input.decisionComment },
      ip,
    });

    return correction;
  }
}
