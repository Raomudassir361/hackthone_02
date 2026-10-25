"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const errors_js_1 = require("../../shared/errors.js");
const attendance_model_js_1 = require("./attendance.model.js");
const org_model_js_1 = require("../org/org.model.js");
const employee_model_js_1 = require("../employees/employee.model.js");
const user_model_js_1 = require("../auth/user.model.js");
const audit_service_js_1 = require("../audit/audit.service.js");
const dates_js_1 = require("../../shared/dates.js");
const workingDays_js_1 = require("../../shared/workingDays.js");
const haversine_js_1 = require("../../shared/haversine.js");
const status_js_1 = require("./status.js");
class AttendanceService {
    /**
     * Helper: Resolves employee ID for current request context.
     */
    static getTargetEmployeeId(ctx, requestedId) {
        if (ctx.role === 'employee') {
            if (!ctx.employeeId) {
                throw new errors_js_1.AppError('NOT_FOUND', 404, 'No employee record linked to user account');
            }
            return ctx.employeeId;
        }
        return requestedId || ctx.employeeId || '';
    }
    /**
     * POST /api/attendance/check-in (F09)
     * Server stamps time; second check-in returns 409 Conflict.
     */
    static async checkIn(ctx, input, ip) {
        const employeeId = this.getTargetEmployeeId(ctx);
        if (!employeeId) {
            throw new errors_js_1.AppError('BAD_REQUEST', 400, 'Employee ID is required for check-in');
        }
        const employee = await employee_model_js_1.EmployeeModel.findById(employeeId);
        if (!employee) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'Employee not found');
        }
        const settings = await org_model_js_1.SettingsModel.findOne();
        const timezone = settings?.timezone || 'Asia/Karachi';
        const serverNow = new Date();
        const companyToday = (0, dates_js_1.getCompanyTodayString)(timezone, serverNow);
        // Guard duplicate: unique (employeeId, date)
        const existing = await attendance_model_js_1.AttendanceModel.findOne({
            employeeId: new mongoose_1.default.Types.ObjectId(employeeId),
            date: companyToday,
        });
        if (existing) {
            throw new errors_js_1.AppError('DUPLICATE_CHECK_IN', 409, 'You have already checked in today');
        }
        // Capture Rule Snapshot
        const ruleSnapshot = {
            officeStart: settings?.officeStart || '09:00',
            graceMinutes: settings?.graceMinutes !== undefined ? settings.graceMinutes : 15,
            halfDayHours: settings?.halfDayHours !== undefined ? settings.halfDayHours : 5,
        };
        // Evaluate Late
        const isLate = (0, status_js_1.isCheckInLate)(serverNow, ruleSnapshot, timezone);
        // Evaluate Working Day
        const holidays = await org_model_js_1.HolidayModel.find().select('date');
        const holidayDates = holidays.map((h) => h.date);
        const weekendDays = settings?.weekendDays || [0, 6];
        const workingDay = (0, workingDays_js_1.isWorkingDay)(companyToday, weekendDays, holidayDates);
        // Geolocation verification (optional advisory)
        let locationData;
        if (input.lat !== undefined && input.lng !== undefined && settings?.officeLat && settings?.officeLng) {
            const dist = (0, haversine_js_1.calculateDistanceMeters)(input.lat, input.lng, settings.officeLat, settings.officeLng);
            locationData = {
                lat: input.lat,
                lng: input.lng,
                distanceMeters: dist,
            };
        }
        const record = await attendance_model_js_1.AttendanceModel.create({
            employeeId: new mongoose_1.default.Types.ObjectId(employeeId),
            date: companyToday,
            checkInAt: serverNow,
            status: isLate ? 'late' : 'present',
            workedMinutes: 0,
            source: 'web',
            isWorkingDay: workingDay,
            ruleSnapshot,
            location: locationData,
        });
        await audit_service_js_1.AuditService.log({
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
    static async checkOut(ctx, input, ip) {
        const employeeId = this.getTargetEmployeeId(ctx);
        if (!employeeId) {
            throw new errors_js_1.AppError('BAD_REQUEST', 400, 'Employee ID is required for check-out');
        }
        const settings = await org_model_js_1.SettingsModel.findOne();
        const timezone = settings?.timezone || 'Asia/Karachi';
        const serverNow = new Date();
        const companyToday = (0, dates_js_1.getCompanyTodayString)(timezone, serverNow);
        const record = await attendance_model_js_1.AttendanceModel.findOne({
            employeeId: new mongoose_1.default.Types.ObjectId(employeeId),
            date: companyToday,
        });
        if (!record) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'No check-in record found for today');
        }
        if (record.checkOutAt) {
            throw new errors_js_1.AppError('BAD_REQUEST', 400, 'You have already checked out today');
        }
        record.checkOutAt = serverNow;
        record.workedMinutes = (0, status_js_1.calculateWorkedMinutes)(record.checkInAt, serverNow);
        const isLate = record.status === 'late';
        record.status = (0, status_js_1.determineAttendanceStatus)({
            isLate,
            hasCheckedOut: true,
            workedMinutes: record.workedMinutes,
            halfDayHours: record.ruleSnapshot.halfDayHours,
        });
        if (input.lat !== undefined && input.lng !== undefined && settings?.officeLat && settings?.officeLng) {
            const dist = (0, haversine_js_1.calculateDistanceMeters)(input.lat, input.lng, settings.officeLat, settings.officeLng);
            record.location = {
                lat: input.lat,
                lng: input.lng,
                distanceMeters: dist,
            };
        }
        await record.save();
        await audit_service_js_1.AuditService.log({
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
    static async getCalendar(ctx, month, targetEmpId) {
        const employeeId = this.getTargetEmployeeId(ctx, targetEmpId);
        if (!employeeId) {
            throw new errors_js_1.AppError('BAD_REQUEST', 400, 'Employee ID is required');
        }
        // Role check: Employee can only see own calendar
        if (ctx.role === 'employee' && employeeId !== ctx.employeeId) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'Calendar not found');
        }
        const employee = await employee_model_js_1.EmployeeModel.findById(employeeId);
        if (!employee) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'Employee not found');
        }
        const settings = await org_model_js_1.SettingsModel.findOne();
        const weekendDays = settings?.weekendDays || [0, 6];
        const holidays = await org_model_js_1.HolidayModel.find().select('date name');
        const holidayMap = new Map();
        holidays.forEach((h) => holidayMap.set(h.date, h.name));
        // Fetch existing attendance records for the month
        const regex = new RegExp(`^${month}-\\d{2}$`);
        const records = await attendance_model_js_1.AttendanceModel.find({
            employeeId: new mongoose_1.default.Types.ObjectId(employeeId),
            date: { $regex: regex },
        }).lean();
        const recordMap = new Map();
        records.forEach((r) => recordMap.set(r.date, r));
        // Build day-by-day calendar array
        const [yearStr, monthStr] = month.split('-');
        const year = Number(yearStr);
        const monthIndex = Number(monthStr) - 1; // 0-based
        const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
        const todayStr = (0, dates_js_1.getCompanyTodayString)(settings?.timezone || 'Asia/Karachi');
        const calendarDays = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dateObj = (0, dates_js_1.parseISODateOnly)(dateStr);
            const dayOfWeek = dateObj.getUTCDay();
            const isWeekend = weekendDays.includes(dayOfWeek);
            const holidayName = holidayMap.get(dateStr);
            const isHoliday = Boolean(holidayName);
            const record = recordMap.get(dateStr);
            let derivedStatus;
            if (record) {
                // If it's a past day and no checkout was recorded
                if (!record.checkOutAt && dateStr < todayStr) {
                    derivedStatus = 'missing_checkout';
                }
                else {
                    derivedStatus = record.status;
                }
            }
            else if (isHoliday) {
                derivedStatus = 'holiday';
            }
            else if (isWeekend) {
                derivedStatus = 'weekend';
            }
            else if (dateStr < todayStr && dateStr >= employee.joinDate) {
                // Past working day after join date without record -> absent
                derivedStatus = 'absent';
            }
            else {
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
    static async getBoard(ctx, date, departmentId) {
        const filter = { status: { $ne: 'exited' } };
        if (departmentId) {
            filter.departmentId = new mongoose_1.default.Types.ObjectId(departmentId);
        }
        const employees = await employee_model_js_1.EmployeeModel.find(filter)
            .populate('departmentId', 'name')
            .populate('designationId', 'title')
            .sort({ code: 1 })
            .lean();
        const empIds = employees.map((e) => e._id);
        const records = await attendance_model_js_1.AttendanceModel.find({
            employeeId: { $in: empIds },
            date,
        }).lean();
        const recordMap = new Map();
        records.forEach((r) => recordMap.set(r.employeeId.toString(), r));
        const settings = await org_model_js_1.SettingsModel.findOne();
        const holidays = await org_model_js_1.HolidayModel.find().select('date name');
        const holidayMap = new Map();
        holidays.forEach((h) => holidayMap.set(h.date, h.name));
        const dateObj = (0, dates_js_1.parseISODateOnly)(date);
        const dayOfWeek = dateObj.getUTCDay();
        const isWeekend = (settings?.weekendDays || [0, 6]).includes(dayOfWeek);
        const holidayName = holidayMap.get(date);
        const isHoliday = Boolean(holidayName);
        const todayStr = (0, dates_js_1.getCompanyTodayString)(settings?.timezone || 'Asia/Karachi');
        let presentCount = 0;
        let lateCount = 0;
        let absentCount = 0;
        let halfDayCount = 0;
        const rows = employees.map((emp) => {
            const record = recordMap.get(emp._id.toString());
            let status;
            if (record) {
                if (!record.checkOutAt && date < todayStr) {
                    status = 'missing_checkout';
                }
                else {
                    status = record.status;
                }
                if (status === 'present')
                    presentCount++;
                else if (status === 'late')
                    lateCount++;
                else if (status === 'half_day')
                    halfDayCount++;
            }
            else if (isHoliday) {
                status = 'holiday';
            }
            else if (isWeekend) {
                status = 'weekend';
            }
            else if (date < todayStr && date >= emp.joinDate) {
                status = 'absent';
                absentCount++;
            }
            else {
                status = 'not_checked_in';
            }
            return {
                employee: {
                    id: emp._id.toString(),
                    code: emp.code,
                    name: emp.name,
                    department: emp.departmentId?.name || '—',
                    designation: emp.designationId?.title || '—',
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
    static async requestCorrection(ctx, input, ip) {
        const employeeId = this.getTargetEmployeeId(ctx);
        if (!employeeId) {
            throw new errors_js_1.AppError('BAD_REQUEST', 400, 'Employee ID is required');
        }
        const correction = await attendance_model_js_1.AttendanceCorrectionModel.create({
            employeeId: new mongoose_1.default.Types.ObjectId(employeeId),
            date: input.date,
            requestedCheckIn: input.requestedCheckIn ? new Date(input.requestedCheckIn) : undefined,
            requestedCheckOut: input.requestedCheckOut ? new Date(input.requestedCheckOut) : undefined,
            reason: input.reason,
            status: 'pending',
        });
        await audit_service_js_1.AuditService.log({
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
    static async getCorrections(ctx, status = 'pending') {
        const filter = {};
        if (status)
            filter.status = status;
        if (ctx.role === 'employee') {
            filter.employeeId = new mongoose_1.default.Types.ObjectId(ctx.employeeId);
        }
        const items = await attendance_model_js_1.AttendanceCorrectionModel.find(filter)
            .populate('employeeId', 'name code')
            .populate('decidedBy', 'email')
            .sort({ createdAt: -1 });
        return items;
    }
    /**
     * Decide correction (HR decides for Employee; Admin decides for HR; no self-approval)
     */
    static async decideCorrection(ctx, id, input, ip) {
        const correction = await attendance_model_js_1.AttendanceCorrectionModel.findById(id);
        if (!correction) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'Correction request not found');
        }
        if (correction.status !== 'pending') {
            throw new errors_js_1.AppError('BAD_REQUEST', 400, 'Correction has already been decided');
        }
        // Rule: No self-approval
        if (ctx.employeeId && correction.employeeId.toString() === ctx.employeeId) {
            throw new errors_js_1.AppError('FORBIDDEN', 403, 'Self-approval is forbidden');
        }
        // Rule: HR's own items decided by Admin
        const empUser = await user_model_js_1.UserModel.findOne({ employeeId: correction.employeeId });
        if (empUser?.role === 'hr' && ctx.role !== 'admin') {
            throw new errors_js_1.AppError('FORBIDDEN', 403, 'HR corrections can only be decided by Admin');
        }
        correction.status = input.status;
        correction.decidedBy = new mongoose_1.default.Types.ObjectId(ctx.userId);
        correction.decisionComment = input.decisionComment;
        correction.decidedAt = new Date();
        await correction.save();
        // If approved, update or insert attendance record with source = 'correction'
        if (input.status === 'approved') {
            const settings = await org_model_js_1.SettingsModel.findOne();
            const ruleSnapshot = {
                officeStart: settings?.officeStart || '09:00',
                graceMinutes: settings?.graceMinutes !== undefined ? settings.graceMinutes : 15,
                halfDayHours: settings?.halfDayHours !== undefined ? settings.halfDayHours : 5,
            };
            const checkIn = correction.requestedCheckIn || new Date(`${correction.date}T09:00:00.000Z`);
            const checkOut = correction.requestedCheckOut;
            const worked = (0, status_js_1.calculateWorkedMinutes)(checkIn, checkOut);
            const isLate = (0, status_js_1.isCheckInLate)(checkIn, ruleSnapshot, settings?.timezone || 'Asia/Karachi');
            const status = (0, status_js_1.determineAttendanceStatus)({
                isLate,
                hasCheckedOut: Boolean(checkOut),
                workedMinutes: worked,
                halfDayHours: ruleSnapshot.halfDayHours,
            });
            await attendance_model_js_1.AttendanceModel.findOneAndUpdate({ employeeId: correction.employeeId, date: correction.date }, {
                $set: {
                    checkInAt: checkIn,
                    checkOutAt: checkOut,
                    workedMinutes: worked,
                    status,
                    source: 'correction',
                    correctionId: correction._id,
                    ruleSnapshot,
                },
            }, { upsert: true, new: true });
        }
        await audit_service_js_1.AuditService.log({
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
exports.AttendanceService = AttendanceService;
