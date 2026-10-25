import mongoose from 'mongoose';
import { AppError } from '../../shared/errors.js';
import { LeaveRequestModel } from './leave.model.js';
import { LeaveTypeModel, SettingsModel, HolidayModel } from '../org/org.model.js';
import { UserModel } from '../auth/user.model.js';
import { AuditService } from '../audit/audit.service.js';
import { RequestContext } from '../../middleware/auth.js';
import { countWorkingDays } from '../../shared/workingDays.js';
import { ApplyLeaveInput, DecideLeaveInput } from './leave.schema.js';

export interface LeaveBalanceItem {
  key: string;
  name: string;
  quota: number | null;
  used: number; // approved days
  pending: number; // pending days
  remaining: number | null; // quota - used (null if unlimited)
}

export class LeaveService {
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
   * Compute working days between two ISO dates, skipping weekends and holidays.
   */
  public static async calculateLeaveWorkingDays(startDate: string, endDate: string): Promise<number> {
    const settings = await SettingsModel.findOne();
    const weekendDays = settings?.weekendDays || [0, 6];
    const holidays = await HolidayModel.find().select('date');
    const holidayDates = holidays.map((h) => h.date);

    return countWorkingDays({
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
  public static async getLeaveBalance(
    ctx: RequestContext,
    targetEmployeeId?: string
  ): Promise<LeaveBalanceItem[]> {
    const employeeId = this.getTargetEmployeeId(ctx, targetEmployeeId);
    if (!employeeId) {
      throw new AppError('BAD_REQUEST', 400, 'Employee ID is required');
    }

    if (ctx.role === 'employee' && employeeId !== ctx.employeeId) {
      throw new AppError('NOT_FOUND', 404, 'Balance record not found');
    }

    const leaveTypes = await LeaveTypeModel.find().sort({ createdAt: 1 });

    // Find all active requests for this employee in current calendar year
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    const requests = await LeaveRequestModel.find({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      startDate: { $gte: yearStart, $lte: yearEnd },
      status: { $in: ['approved', 'pending'] },
    });

    const usedMap = new Map<string, number>();
    const pendingMap = new Map<string, number>();

    for (const req of requests) {
      const key = req.leaveTypeKey.toLowerCase();
      if (req.status === 'approved') {
        usedMap.set(key, (usedMap.get(key) || 0) + req.workingDays);
      } else if (req.status === 'pending') {
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
  public static async applyLeave(ctx: RequestContext, input: ApplyLeaveInput, ip?: string) {
    const employeeId = this.getTargetEmployeeId(ctx);
    if (!employeeId) {
      throw new AppError('BAD_REQUEST', 400, 'Employee ID is required');
    }

    if (input.startDate > input.endDate) {
      throw new AppError('INVALID_DATES', 422, 'Start date must be before or on end date');
    }

    // 1. Calculate working days
    const workingDays = await this.calculateLeaveWorkingDays(input.startDate, input.endDate);
    if (workingDays <= 0) {
      throw new AppError(
        'ZERO_WORKING_DAYS',
        422,
        'The selected date range contains no working days (all dates fall on weekends or holidays)'
      );
    }

    // 2. Check for Overlap with existing pending or approved requests
    // Range A and Range B overlap iff (StartA <= EndB) and (EndA >= StartB)
    const overlapping = await LeaveRequestModel.findOne({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      status: { $in: ['pending', 'approved'] },
      startDate: { $lte: input.endDate },
      endDate: { $gte: input.startDate },
    });

    if (overlapping) {
      throw new AppError(
        'LEAVE_OVERLAP',
        422,
        `Requested dates overlap with an existing ${overlapping.status} leave (${overlapping.startDate} to ${overlapping.endDate})`
      );
    }

    // 3. Check Quota / Balance
    const leaveType = await LeaveTypeModel.findOne({
      key: input.leaveTypeKey.toLowerCase(),
    });
    if (!leaveType) {
      throw new AppError('NOT_FOUND', 404, `Leave type '${input.leaveTypeKey}' not found`);
    }

    if (leaveType.yearlyQuota !== null) {
      const balances = await this.getLeaveBalance(ctx, employeeId);
      const balance = balances.find((b) => b.key.toLowerCase() === input.leaveTypeKey.toLowerCase());
      const currentApproved = balance?.used || 0;
      const currentPending = balance?.pending || 0;

      // Validation rule per rules.md: approved + pending + requested <= quota
      if (currentApproved + currentPending + workingDays > leaveType.yearlyQuota) {
        const available = Math.max(0, leaveType.yearlyQuota - (currentApproved + currentPending));
        throw new AppError(
          'OVER_BALANCE',
          422,
          `Leave request exceeds balance. You have ${available} days available (${currentApproved} approved, ${currentPending} pending of ${leaveType.yearlyQuota} quota).`
        );
      }
    }

    // 4. Save leave request
    const request = await LeaveRequestModel.create({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      leaveTypeKey: input.leaveTypeKey.toLowerCase(),
      startDate: input.startDate,
      endDate: input.endDate,
      workingDays,
      reason: input.reason,
      status: 'pending',
      source: input.source || 'form',
    });

    await AuditService.log({
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
  public static async getLeaveRequests(
    ctx: RequestContext,
    options: { status?: string; employeeId?: string }
  ) {
    const filter: Record<string, unknown> = {};

    if (options.status) {
      filter.status = options.status;
    }

    if (ctx.role === 'employee') {
      filter.employeeId = new mongoose.Types.ObjectId(ctx.employeeId);
    } else if (options.employeeId) {
      filter.employeeId = new mongoose.Types.ObjectId(options.employeeId);
    }

    const items = await LeaveRequestModel.find(filter)
      .populate('employeeId', 'name code departmentId')
      .populate('decidedBy', 'email')
      .sort({ createdAt: -1 });

    return items;
  }

  /**
   * GET /api/leave/inbox (Pending requests for HR/Admin review)
   */
  public static async getLeaveInbox(_ctx: RequestContext) {
    const items = await LeaveRequestModel.find({ status: 'pending' })
      .populate('employeeId', 'name code')
      .sort({ createdAt: 1 });

    // If requester is an HR user, their own requests are only decided by Admin
    return items;
  }

  /**
   * POST /api/leave/:id/decide (F13)
   * Decide leave with comment. Forbids self-approval. HR requests decided by Admin.
   */
  public static async decideLeave(
    ctx: RequestContext,
    id: string,
    input: DecideLeaveInput,
    ip?: string
  ) {
    const request = await LeaveRequestModel.findById(id);
    if (!request) {
      throw new AppError('NOT_FOUND', 404, 'Leave request not found');
    }

    if (request.status !== 'pending') {
      throw new AppError('BAD_REQUEST', 400, 'Leave request has already been decided or cancelled');
    }

    // Rule: No self-approval
    if (ctx.employeeId && request.employeeId.toString() === ctx.employeeId) {
      throw new AppError('FORBIDDEN', 403, 'Self-approval is forbidden');
    }

    // Rule: HR's own items decided by Admin
    const empUser = await UserModel.findOne({ employeeId: request.employeeId });
    if (empUser?.role === 'hr' && ctx.role !== 'admin') {
      throw new AppError('FORBIDDEN', 403, 'HR leave requests can only be approved by Admin');
    }

    request.status = input.status;
    request.decidedBy = new mongoose.Types.ObjectId(ctx.userId);
    request.decisionComment = input.decisionComment;
    request.decidedAt = new Date();
    await request.save();

    await AuditService.log({
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
  public static async cancelLeave(ctx: RequestContext, id: string, ip?: string) {
    const request = await LeaveRequestModel.findById(id);
    if (!request) {
      throw new AppError('NOT_FOUND', 404, 'Leave request not found');
    }

    if (request.status !== 'pending') {
      throw new AppError('BAD_REQUEST', 400, 'Only pending leave requests can be cancelled');
    }

    // Must be owner or admin/hr
    if (ctx.role === 'employee' && request.employeeId.toString() !== ctx.employeeId) {
      throw new AppError('FORBIDDEN', 403, 'You can only cancel your own leave requests');
    }

    request.status = 'cancelled';
    await request.save();

    await AuditService.log({
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
