import mongoose from 'mongoose';
import { EmployeeModel } from '../employees/employee.model.js';
import { AttendanceModel } from '../attendance/attendance.model.js';
import { LeaveRequestModel } from '../leave/leave.model.js';
import { PayrollRunModel, PayslipModel } from '../payroll/payroll.model.js';
import { AuditLogModel } from '../audit/audit.model.js';
import { round2 } from '../../shared/money.js';
import { RequestContext } from '../../middleware/auth.js';

export interface AnalyticsFilter {
  from?: string;
  to?: string;
  departmentId?: string;
}

export class AnalyticsService {
  /**
   * Helper: Resolves start date, end date, and department filter.
   */
  private static resolveDates(filter: AnalyticsFilter) {
    const today = new Date().toISOString().split('T')[0];
    const to = filter.to || today;
    // Default 'from': first of current month
    const from = filter.from || `${to.slice(0, 7)}-01`;
    return { from, to };
  }

  /**
   * Helper: Headcount query.
   */
  public static async getHeadcount(asOfDate?: string, departmentId?: string) {
    const date = asOfDate || new Date().toISOString().split('T')[0];
    const match: Record<string, unknown> = {
      joinDate: { $lte: date },
      $or: [
        { exitDate: { $exists: false } },
        { exitDate: null },
        { exitDate: { $gt: date } },
      ],
      status: { $in: ['active', 'probation'] },
    };

    if (departmentId) {
      match.departmentId = new mongoose.Types.ObjectId(departmentId);
    }

    const count = await EmployeeModel.countDocuments(match);
    return count;
  }

  /**
   * Helper: Attendance summary & metrics within range.
   */
  public static async getAttendanceMetrics(filter: AnalyticsFilter) {
    const { from, to } = this.resolveDates(filter);
    const match: Record<string, unknown> = {
      date: { $gte: from, $lte: to },
    };

    if (filter.departmentId) {
      // Find employee IDs in this department
      const empIds = await EmployeeModel.find({
        departmentId: new mongoose.Types.ObjectId(filter.departmentId),
      }).distinct('_id');
      match.employeeId = { $in: empIds };
    }

    const records = await AttendanceModel.find(match).lean();

    let present = 0;
    let late = 0;
    let halfDay = 0;
    let missingCheckout = 0;
    let onLeave = 0;

    for (const r of records) {
      if (r.status === 'present') present++;
      else if (r.status === 'late') late++;
      else if (r.status === 'half_day') halfDay++;
      else if (r.status === 'missing_checkout') missingCheckout++;
      else if (r.status === 'on_leave') onLeave++;
    }

    // Attendance Rate = (present + late + missing_checkout + 0.5 * half_day) / (total working day records - on_leave)
    const numerator = present + late + missingCheckout + 0.5 * halfDay;
    const denominator = records.length - onLeave;
    const attendanceRate = denominator > 0 ? round2((numerator / denominator) * 100) : 100;

    // Late % = late / (present + late)
    const lateDenominator = present + late;
    const latePct = lateDenominator > 0 ? round2((late / lateDenominator) * 100) : 0;

    return {
      from,
      to,
      totalRecords: records.length,
      present,
      late,
      halfDay,
      missingCheckout,
      onLeave,
      attendanceRate,
      latePct,
    };
  }

  /**
   * Top late-comers within date range.
   */
  public static async getTopLateComers(filter: AnalyticsFilter, limit = 5) {
    const { from, to } = this.resolveDates(filter);

    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          date: { $gte: from, $lte: to },
          status: 'late',
        },
      },
      {
        $group: {
          _id: '$employeeId',
          lateCount: { $sum: 1 },
        },
      },
      {
        $sort: { lateCount: -1 },
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: '_id',
          as: 'employee',
        },
      },
      {
        $unwind: '$employee',
      },
      {
        $project: {
          _id: 1,
          lateCount: 1,
          name: '$employee.name',
          code: '$employee.code',
          departmentId: '$employee.departmentId',
        },
      },
    ];

    if (filter.departmentId) {
      pipeline.push({
        $match: {
          departmentId: new mongoose.Types.ObjectId(filter.departmentId),
        },
      });
    }

    const lateComers = await AttendanceModel.aggregate(pipeline);
    return lateComers;
  }

  /**
   * Leave utilization by leave type.
   */
  public static async getLeaveUtilization(filter: AnalyticsFilter) {
    const { from, to } = this.resolveDates(filter);

    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          status: 'approved',
          startDate: { $lte: to },
          endDate: { $gte: from },
        },
      },
      {
        $group: {
          _id: '$leaveTypeKey',
          approvedDays: { $sum: '$workingDays' },
          count: { $sum: 1 },
        },
      },
    ];

    const utilization = await LeaveRequestModel.aggregate(pipeline);
    return utilization.map((u) => ({
      type: u._id,
      days: u.approvedDays,
      count: u.count,
    }));
  }

  /**
   * GET /api/dashboard/hr (F18)
   */
  public static async getHrDashboard(filter: AnalyticsFilter) {
    const { from, to } = this.resolveDates(filter);
    const today = new Date().toISOString().split('T')[0];

    // 1. Headcount
    const headcount = await this.getHeadcount(to, filter.departmentId);

    // 2. Attendance & Late metrics in period
    const attMetrics = await this.getAttendanceMetrics(filter);

    // 3. Today's live snapshot
    const todayMatch: Record<string, unknown> = { date: today };
    if (filter.departmentId) {
      const empIds = await EmployeeModel.find({
        departmentId: new mongoose.Types.ObjectId(filter.departmentId),
      }).distinct('_id');
      todayMatch.employeeId = { $in: empIds };
    }
    const todayRecords = await AttendanceModel.find(todayMatch).lean();
    let presentToday = 0;
    let lateToday = 0;
    let halfDayToday = 0;
    for (const r of todayRecords) {
      if (r.status === 'present') presentToday++;
      else if (r.status === 'late') lateToday++;
      else if (r.status === 'half_day') halfDayToday++;
    }

    // 4. Pending approvals
    const pendingLeave = await LeaveRequestModel.countDocuments({ status: 'pending' });

    // 5. Top 5 late comers
    const topLateComers = await this.getTopLateComers(filter, 5);

    // 6. Leave by type
    const leaveByType = await this.getLeaveUtilization(filter);

    // 7. Headcount by department
    const headcountByDept = await EmployeeModel.aggregate([
      {
        $match: {
          status: { $in: ['active', 'probation'] },
        },
      },
      {
        $group: {
          _id: '$departmentId',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'dept',
        },
      },
      {
        $unwind: { path: '$dept', preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          departmentName: { $ifNull: ['$dept.name', 'Unassigned'] },
          count: 1,
        },
      },
    ]);

    // 8. T10.3: Absence Anomaly & Attrition Risk Scoring
    // Detect employees with high late occurrences (>3) or frequent leaves
    const attritionRisks = topLateComers.map((tlc) => {
      let riskScore: 'Low' | 'Medium' | 'High' = 'Low';
      let reason = 'Consistent schedule';
      if (tlc.lateCount >= 5) {
        riskScore = 'High';
        reason = `${tlc.lateCount} late arrivals in period`;
      } else if (tlc.lateCount >= 3) {
        riskScore = 'Medium';
        reason = `${tlc.lateCount} late arrivals in period`;
      }
      return {
        employeeId: tlc._id,
        name: tlc.name,
        code: tlc.code,
        riskScore,
        reason,
      };
    });

    return {
      period: { from, to },
      kpis: {
        headcount,
        presentToday,
        lateToday,
        halfDayToday,
        attendanceRate: attMetrics.attendanceRate,
        latePct: attMetrics.latePct,
        pendingApprovals: pendingLeave,
      },
      topLateComers,
      attritionRisks,
      leaveByType,
      headcountByDept,
    };
  }

  /**
   * GET /api/dashboard/admin (F18)
   */
  public static async getAdminDashboard(filter: AnalyticsFilter) {
    const { from, to } = this.resolveDates(filter);
    const yearStart = `${to.slice(0, 4)}-01-01`;

    // 1. Current Headcount
    const headcount = await this.getHeadcount(to);

    // 2. Attrition YTD: Exits in year / average headcount * 100
    const exitsYtd = await EmployeeModel.countDocuments({
      exitDate: { $gte: yearStart, $lte: to },
      status: 'exited',
    });
    const avgHeadcount = headcount > 0 ? (headcount + exitsYtd) / 2 : 1;
    const attritionYtd = round2((exitsYtd / avgHeadcount) * 100);

    // 3. Payroll cost & average salary
    // Fetch latest finalized or draft payroll run
    const latestRun = await PayrollRunModel.findOne().sort({ month: -1 }).lean();
    const payrollCost = latestRun?.totals.net || 0;
    const payrollGross = latestRun?.totals.gross || 0;

    // Average basic salary across all active employees
    const salaryAgg = await EmployeeModel.aggregate([
      { $match: { status: { $in: ['active', 'probation'] } } },
      { $group: { _id: null, avgSalary: { $avg: '$basicSalary' } } },
    ]);
    const avgSalary = salaryAgg.length > 0 ? round2(salaryAgg[0].avgSalary) : 0;

    // 4. Headcount by department
    const headcountByDept = await EmployeeModel.aggregate([
      { $match: { status: { $in: ['active', 'probation'] } } },
      { $group: { _id: '$departmentId', count: { $sum: 1 } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      { $project: { departmentName: { $ifNull: ['$dept.name', 'Unassigned'] }, count: 1 } },
    ]);

    // 5. Gender diversity & breakdown
    const genderDiversity = await EmployeeModel.aggregate([
      { $match: { status: { $in: ['active', 'probation'] } } },
      { $group: { _id: '$gender', count: { $sum: 1 } } },
    ]);

    // 6. Recent Audit Feed (latest 8 actions)
    const recentAudit = await AuditLogModel.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    return {
      period: { from, to },
      kpis: {
        headcount,
        attritionYtd,
        payrollCost,
        payrollGross,
        avgSalary,
        lastPayrollMonth: latestRun?.month || 'N/A',
      },
      headcountByDept,
      genderDiversity: genderDiversity.map((g) => ({ gender: g._id || 'unspecified', count: g.count })),
      recentAudit,
    };
  }

  /**
   * GET /api/dashboard/employee (F18)
   */
  public static async getEmployeeDashboard(ctx: RequestContext) {
    if (!ctx.employeeId) {
      return {
        checkInStatus: null,
        weeklyHours: 0,
        lateCount: 0,
        leaveBalances: [],
        lastPayslip: null,
      };
    }

    const employeeId = new mongoose.Types.ObjectId(ctx.employeeId);
    const today = new Date().toISOString().split('T')[0];

    // 1. Today's Check-in Record
    const todayAttendance = await AttendanceModel.findOne({
      employeeId,
      date: today,
    }).lean();

    // 2. Weekly Hours (current ISO week: Monday to Sunday)
    const now = new Date();
    const dayOfWeek = (now.getUTCDay() + 6) % 7; // Monday = 0
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - dayOfWeek);
    const mondayStr = monday.toISOString().split('T')[0];

    const weekRecords = await AttendanceModel.find({
      employeeId,
      date: { $gte: mondayStr, $lte: today },
    }).lean();

    let totalWorkedMinutes = 0;
    let lateCountMonth = 0;
    const currentMonth = today.slice(0, 7);

    for (const r of weekRecords) {
      totalWorkedMinutes += r.workedMinutes || 0;
    }

    // Month late count
    const monthLateRecords = await AttendanceModel.countDocuments({
      employeeId,
      date: { $regex: `^${currentMonth}` },
      status: 'late',
    });
    lateCountMonth = monthLateRecords;

    const weeklyHours = round2(totalWorkedMinutes / 60);

    // 3. Leave Balances Summary
    const annualLeaves = await LeaveRequestModel.find({
      employeeId,
      status: 'approved',
    }).lean();

    let annualUsed = 0;
    let sickUsed = 0;
    let casualUsed = 0;

    for (const l of annualLeaves) {
      if (l.leaveTypeKey === 'annual') annualUsed += l.workingDays;
      else if (l.leaveTypeKey === 'sick') sickUsed += l.workingDays;
      else if (l.leaveTypeKey === 'casual') casualUsed += l.workingDays;
    }

    const leaveBalances = [
      { key: 'annual', name: 'Annual Leave', remaining: Math.max(0, 14 - annualUsed), quota: 14 },
      { key: 'sick', name: 'Sick Leave', remaining: Math.max(0, 8 - sickUsed), quota: 8 },
      { key: 'casual', name: 'Casual Leave', remaining: Math.max(0, 10 - casualUsed), quota: 10 },
    ];

    // 4. Last Payslip
    const lastPayslip = await PayslipModel.findOne({ employeeId })
      .sort({ month: -1 })
      .lean();

    return {
      todayRecord: todayAttendance,
      weeklyHours,
      targetWeeklyHours: 40,
      lateCountMonth,
      leaveBalances,
      lastPayslip,
    };
  }
}
