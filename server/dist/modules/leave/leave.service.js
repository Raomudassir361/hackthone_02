"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const errors_js_1 = require("../../shared/errors.js");
const leave_model_js_1 = require("./leave.model.js");
const org_model_js_1 = require("../org/org.model.js");
const user_model_js_1 = require("../auth/user.model.js");
const audit_service_js_1 = require("../audit/audit.service.js");
const workingDays_js_1 = require("../../shared/workingDays.js");
class LeaveService {
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
     * Compute working days between two ISO dates, skipping weekends and holidays.
     */
    static async calculateLeaveWorkingDays(startDate, endDate) {
        const settings = await org_model_js_1.SettingsModel.findOne();
        const weekendDays = settings?.weekendDays || [0, 6];
        const holidays = await org_model_js_1.HolidayModel.find().select('date');
        const holidayDates = holidays.map((h) => h.date);
        return (0, workingDays_js_1.countWorkingDays)({
            startDate,
            endDate,
            weekendDays,
            holidayDates,
        });
    }
    /**
     * GET /api/leave/balance (F12)
     * Balances computed from leave_requests, never stored (prevents drift).
     */
    static async getLeaveBalance(ctx, targetEmployeeId) {
        const employeeId = this.getTargetEmployeeId(ctx, targetEmployeeId);
        if (!employeeId) {
            throw new errors_js_1.AppError('BAD_REQUEST', 400, 'Employee ID is required');
        }
        if (ctx.role === 'employee' && employeeId !== ctx.employeeId) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'Balance record not found');
        }
        const leaveTypes = await org_model_js_1.LeaveTypeModel.find().sort({ createdAt: 1 });
        // Find all active requests for this employee in current calendar year
        const currentYear = new Date().getFullYear();
        const yearStart = `${currentYear}-01-01`;
        const yearEnd = `${currentYear}-12-31`;
        const requests = await leave_model_js_1.LeaveRequestModel.find({
            employeeId: new mongoose_1.default.Types.ObjectId(employeeId),
            startDate: { $gte: yearStart, $lte: yearEnd },
            status: { $in: ['approved', 'pending'] },
        });
        const usedMap = new Map();
        const pendingMap = new Map();
        for (const req of requests) {
            const key = req.leaveTypeKey.toLowerCase();
            if (req.status === 'approved') {
                usedMap.set(key, (usedMap.get(key) || 0) + req.workingDays);
            }
            else if (req.status === 'pending') {
                pendingMap.set(key, (pendingMap.get(key) || 0) + req.workingDays);
            }
        }
        return leaveTypes.map((lt) => {
            const key = lt.key.toLowerCase();
            const quota = lt.yearlyQuota;
            const used = usedMap.get(key) || 0;
            const pending = pendingMap.get(key) || 0;
            const remaining = quota !== null ? Math.max(0, quota - used) : null;
            return {
                key: lt.key,
                name: lt.name,
                quota,
                used,
                pending,
                remaining,
            };
        });
    }
    /**
     * POST /api/leave (F12)
     * Apply for leave. Enforces working-days > 0, no overlap, and quota balance limits.
     */
    static async applyLeave(ctx, input, ip) {
        const employeeId = this.getTargetEmployeeId(ctx);
        if (!employeeId) {
            throw new errors_js_1.AppError('BAD_REQUEST', 400, 'Employee ID is required');
        }
        if (input.startDate > input.endDate) {
            throw new errors_js_1.AppError('INVALID_DATES', 422, 'Start date must be before or on end date');
        }
        // 1. Calculate working days
        const workingDays = await this.calculateLeaveWorkingDays(input.startDate, input.endDate);
        if (workingDays <= 0) {
            throw new errors_js_1.AppError('ZERO_WORKING_DAYS', 422, 'The selected date range contains no working days (all dates fall on weekends or holidays)');
        }
        // 2. Check for Overlap with existing pending or approved requests
        // Range A and Range B overlap iff (StartA <= EndB) and (EndA >= StartB)
        const overlapping = await leave_model_js_1.LeaveRequestModel.findOne({
            employeeId: new mongoose_1.default.Types.ObjectId(employeeId),
            status: { $in: ['pending', 'approved'] },
            startDate: { $lte: input.endDate },
            endDate: { $gte: input.startDate },
        });
        if (overlapping) {
            throw new errors_js_1.AppError('LEAVE_OVERLAP', 422, `Requested dates overlap with an existing ${overlapping.status} leave (${overlapping.startDate} to ${overlapping.endDate})`);
        }
        // 3. Check Quota / Balance
        const leaveType = await org_model_js_1.LeaveTypeModel.findOne({
            key: input.leaveTypeKey.toLowerCase(),
        });
        if (!leaveType) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, `Leave type '${input.leaveTypeKey}' not found`);
        }
        if (leaveType.yearlyQuota !== null) {
            const balances = await this.getLeaveBalance(ctx, employeeId);
            const balance = balances.find((b) => b.key.toLowerCase() === input.leaveTypeKey.toLowerCase());
            const currentApproved = balance?.used || 0;
            const currentPending = balance?.pending || 0;
            // Validation rule per rules.md: approved + pending + requested <= quota
            if (currentApproved + currentPending + workingDays > leaveType.yearlyQuota) {
                const available = Math.max(0, leaveType.yearlyQuota - (currentApproved + currentPending));
                throw new errors_js_1.AppError('OVER_BALANCE', 422, `Leave request exceeds balance. You have ${available} days available (${currentApproved} approved, ${currentPending} pending of ${leaveType.yearlyQuota} quota).`);
            }
        }
        // 4. Save leave request
        const request = await leave_model_js_1.LeaveRequestModel.create({
            employeeId: new mongoose_1.default.Types.ObjectId(employeeId),
            leaveTypeKey: input.leaveTypeKey.toLowerCase(),
            startDate: input.startDate,
            endDate: input.endDate,
            workingDays,
            reason: input.reason,
            status: 'pending',
            source: input.source || 'form',
        });
        await audit_service_js_1.AuditService.log({
            actorId: ctx.userId,
            actorRole: ctx.role,
            action: 'APPLY_LEAVE',
            entity: 'leave_requests',
            entityId: request._id.toString(),
            after: {
                leaveType: request.leaveTypeKey,
                startDate: request.startDate,
                endDate: request.endDate,
                workingDays: request.workingDays,
            },
            ip,
        });
        return request;
    }
    /**
     * GET /api/leave (own for employee, all/filtered for HR/Admin)
     */
    static async getLeaveRequests(ctx, options) {
        const filter = {};
        if (options.status) {
            filter.status = options.status;
        }
        if (ctx.role === 'employee') {
            filter.employeeId = new mongoose_1.default.Types.ObjectId(ctx.employeeId);
        }
        else if (options.employeeId) {
            filter.employeeId = new mongoose_1.default.Types.ObjectId(options.employeeId);
        }
        const items = await leave_model_js_1.LeaveRequestModel.find(filter)
            .populate('employeeId', 'name code departmentId')
            .populate('decidedBy', 'email')
            .sort({ createdAt: -1 });
        return items;
    }
    /**
     * GET /api/leave/inbox (Pending requests for HR/Admin review)
     */
    static async getLeaveInbox(_ctx) {
        const items = await leave_model_js_1.LeaveRequestModel.find({ status: 'pending' })
            .populate('employeeId', 'name code')
            .sort({ createdAt: 1 });
        // If requester is an HR user, their own requests are only decided by Admin
        return items;
    }
    /**
     * POST /api/leave/:id/decide (F13)
     * Decide leave with comment. Forbids self-approval. HR requests decided by Admin.
     */
    static async decideLeave(ctx, id, input, ip) {
        const request = await leave_model_js_1.LeaveRequestModel.findById(id);
        if (!request) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'Leave request not found');
        }
        if (request.status !== 'pending') {
            throw new errors_js_1.AppError('BAD_REQUEST', 400, 'Leave request has already been decided or cancelled');
        }
        // Rule: No self-approval
        if (ctx.employeeId && request.employeeId.toString() === ctx.employeeId) {
            throw new errors_js_1.AppError('FORBIDDEN', 403, 'Self-approval is forbidden');
        }
        // Rule: HR's own items decided by Admin
        const empUser = await user_model_js_1.UserModel.findOne({ employeeId: request.employeeId });
        if (empUser?.role === 'hr' && ctx.role !== 'admin') {
            throw new errors_js_1.AppError('FORBIDDEN', 403, 'HR leave requests can only be approved by Admin');
        }
        request.status = input.status;
        request.decidedBy = new mongoose_1.default.Types.ObjectId(ctx.userId);
        request.decisionComment = input.decisionComment;
        request.decidedAt = new Date();
        await request.save();
        await audit_service_js_1.AuditService.log({
            actorId: ctx.userId,
            actorRole: ctx.role,
            action: 'DECIDE_LEAVE',
            entity: 'leave_requests',
            entityId: id,
            after: { status: input.status, decisionComment: input.decisionComment },
            ip,
        });
        return request;
    }
    /**
     * POST /api/leave/:id/cancel (F12)
     * Requester cancels their pending leave request.
     */
    static async cancelLeave(ctx, id, ip) {
        const request = await leave_model_js_1.LeaveRequestModel.findById(id);
        if (!request) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'Leave request not found');
        }
        if (request.status !== 'pending') {
            throw new errors_js_1.AppError('BAD_REQUEST', 400, 'Only pending leave requests can be cancelled');
        }
        // Must be owner or admin/hr
        if (ctx.role === 'employee' && request.employeeId.toString() !== ctx.employeeId) {
            throw new errors_js_1.AppError('FORBIDDEN', 403, 'You can only cancel your own leave requests');
        }
        request.status = 'cancelled';
        await request.save();
        await audit_service_js_1.AuditService.log({
            actorId: ctx.userId,
            actorRole: ctx.role,
            action: 'CANCEL_LEAVE',
            entity: 'leave_requests',
            entityId: id,
            after: { status: 'cancelled' },
            ip,
        });
        return request;
    }
}
exports.LeaveService = LeaveService;
