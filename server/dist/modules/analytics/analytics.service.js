"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const employee_model_js_1 = require("../employees/employee.model.js");
const attendance_model_js_1 = require("../attendance/attendance.model.js");
const leave_model_js_1 = require("../leave/leave.model.js");
const payroll_model_js_1 = require("../payroll/payroll.model.js");
const audit_model_js_1 = require("../audit/audit.model.js");
const money_js_1 = require("../../shared/money.js");
class AnalyticsService {
    /**
     * Helper: Resolves start date, end date, and department filter.
     */
    static resolveDates(filter) {
        const today = new Date().toISOString().split('T')[0];
        const to = filter.to || today;
        // Default 'from': first of current month
        const from = filter.from || `${to.slice(0, 7)}-01`;
        return { from, to };
    }
    /**
     * Helper: Headcount query.
     */
    static async getHeadcount(asOfDate, departmentId) {
        const date = asOfDate || new Date().toISOString().split('T')[0];
        const match = {
            joinDate: { $lte: date },
            $or: [
                { exitDate: { $exists: false } },
                { exitDate: null },
                { exitDate: { $gt: date } },
            ],
            status: { $in: ['active', 'probation'] },
        };
        if (departmentId) {
            match.departmentId = new mongoose_1.default.Types.ObjectId(departmentId);
        }
        const count = await employee_model_js_1.EmployeeModel.countDocuments(match);
        return count;
    }
    /**
     * Helper: Attendance summary & metrics within range.
     */
    static async getAttendanceMetrics(filter) {
        const { from, to } = this.resolveDates(filter);
        const match = {
            date: { $gte: from, $lte: to },
        };
        if (filter.departmentId) {
            // Find employee IDs in this department
            const empIds = await employee_model_js_1.EmployeeModel.find({
                departmentId: new mongoose_1.default.Types.ObjectId(filter.departmentId),
            }).distinct('_id');
            match.employeeId = { $in: empIds };
        }
        const records = await attendance_model_js_1.AttendanceModel.find(match).lean();
        let present = 0;
        let late = 0;
        let halfDay = 0;
        let missingCheckout = 0;
        let onLeave = 0;
        for (const r of records) {
            if (r.status === 'present')
                present++;
            else if (r.status === 'late')
                late++;
            else if (r.status === 'half_day')
                halfDay++;
            else if (r.status === 'missing_checkout')
                missingCheckout++;
            else if (r.status === 'on_leave')
                onLeave++;
        }
        // Attendance Rate = (present + late + missing_checkout + 0.5 * half_day) / (total working day records - on_leave)
        const numerator = present + late + missingCheckout + 0.5 * halfDay;
        const denominator = records.length - onLeave;
        const attendanceRate = denominator > 0 ? (0, money_js_1.round2)((numerator / denominator) * 100) : 100;
        // Late % = late / (present + late)
        const lateDenominator = present + late;
        const latePct = lateDenominator > 0 ? (0, money_js_1.round2)((late / lateDenominator) * 100) : 0;
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
    static async getTopLateComers(filter, limit = 5) {
        const { from, to } = this.resolveDates(filter);
        const pipeline = [
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
                    departmentId: new mongoose_1.default.Types.ObjectId(filter.departmentId),
                },
            });
        }
        const lateComers = await attendance_model_js_1.AttendanceModel.aggregate(pipeline);
        return lateComers;
    }
    /**
     * Leave utilization by leave type.
     */
    static async getLeaveUtilization(filter) {
        const { from, to } = this.resolveDates(filter);
        const pipeline = [
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
        const utilization = await leave_model_js_1.LeaveRequestModel.aggregate(pipeline);
        return utilization.map((u) => ({
            type: u._id,
            days: u.approvedDays,
            count: u.count,
        }));
    }
    /**
     * GET /api/dashboard/hr (F18)
     */
    static async getHrDashboard(filter) {
        const { from, to } = this.resolveDates(filter);
        const today = new Date().toISOString().split('T')[0];
        // 1. Headcount
        const headcount = await this.getHeadcount(to, filter.departmentId);
        // 2. Attendance & Late metrics in period
        const attMetrics = await this.getAttendanceMetrics(filter);
        // 3. Today's live snapshot
        const todayMatch = { date: today };
        if (filter.departmentId) {
            const empIds = await employee_model_js_1.EmployeeModel.find({
                departmentId: new mongoose_1.default.Types.ObjectId(filter.departmentId),
            }).distinct('_id');
            todayMatch.employeeId = { $in: empIds };
        }
        const todayRecords = await attendance_model_js_1.AttendanceModel.find(todayMatch).lean();
        let presentToday = 0;
        let lateToday = 0;
        let halfDayToday = 0;
        for (const r of todayRecords) {
            if (r.status === 'present')
                presentToday++;
            else if (r.status === 'late')
                lateToday++;
            else if (r.status === 'half_day')
                halfDayToday++;
        }
        // 4. Pending approvals
        const pendingLeave = await leave_model_js_1.LeaveRequestModel.countDocuments({ status: 'pending' });
        // 5. Top 5 late comers
        const topLateComers = await this.getTopLateComers(filter, 5);
        // 6. Leave by type
        const leaveByType = await this.getLeaveUtilization(filter);
        // 7. Headcount by department
        const headcountByDept = await employee_model_js_1.EmployeeModel.aggregate([
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
            let riskScore = 'Low';
            let reason = 'Consistent schedule';
            if (tlc.lateCount >= 5) {
                riskScore = 'High';
                reason = `${tlc.lateCount} late arrivals in period`;
            }
            else if (tlc.lateCount >= 3) {
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
    static async getAdminDashboard(filter) {
        const { from, to } = this.resolveDates(filter);
        const yearStart = `${to.slice(0, 4)}-01-01`;
        // 1. Current Headcount
        const headcount = await this.getHeadcount(to);
        // 2. Attrition YTD: Exits in year / average headcount * 100
        const exitsYtd = await employee_model_js_1.EmployeeModel.countDocuments({
            exitDate: { $gte: yearStart, $lte: to },
            status: 'exited',
        });
        const avgHeadcount = headcount > 0 ? (headcount + exitsYtd) / 2 : 1;
        const attritionYtd = (0, money_js_1.round2)((exitsYtd / avgHeadcount) * 100);
        // 3. Payroll cost & average salary
        // Fetch latest finalized or draft payroll run
        const latestRun = await payroll_model_js_1.PayrollRunModel.findOne().sort({ month: -1 }).lean();
        const payrollCost = latestRun?.totals.net || 0;
        const payrollGross = latestRun?.totals.gross || 0;
        // Average basic salary across all active employees
        const salaryAgg = await employee_model_js_1.EmployeeModel.aggregate([
            { $match: { status: { $in: ['active', 'probation'] } } },
            { $group: { _id: null, avgSalary: { $avg: '$basicSalary' } } },
        ]);
        const avgSalary = salaryAgg.length > 0 ? (0, money_js_1.round2)(salaryAgg[0].avgSalary) : 0;
        // 4. Headcount by department
        const headcountByDept = await employee_model_js_1.EmployeeModel.aggregate([
            { $match: { status: { $in: ['active', 'probation'] } } },
            { $group: { _id: '$departmentId', count: { $sum: 1 } } },
            { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
            { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
            { $project: { departmentName: { $ifNull: ['$dept.name', 'Unassigned'] }, count: 1 } },
        ]);
        // 5. Gender diversity & breakdown
        const genderDiversity = await employee_model_js_1.EmployeeModel.aggregate([
            { $match: { status: { $in: ['active', 'probation'] } } },
            { $group: { _id: '$gender', count: { $sum: 1 } } },
        ]);
        // 6. Recent Audit Feed (latest 8 actions)
        const recentAudit = await audit_model_js_1.AuditLogModel.find()
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
    static async getEmployeeDashboard(ctx) {
        if (!ctx.employeeId) {
            return {
                checkInStatus: null,
                weeklyHours: 0,
                lateCount: 0,
                leaveBalances: [],
                lastPayslip: null,
            };
        }
        const employeeId = new mongoose_1.default.Types.ObjectId(ctx.employeeId);
        const today = new Date().toISOString().split('T')[0];
        // 1. Today's Check-in Record
        const todayAttendance = await attendance_model_js_1.AttendanceModel.findOne({
            employeeId,
            date: today,
        }).lean();
        // 2. Weekly Hours (current ISO week: Monday to Sunday)
        const now = new Date();
        const dayOfWeek = (now.getUTCDay() + 6) % 7; // Monday = 0
        const monday = new Date(now);
        monday.setUTCDate(now.getUTCDate() - dayOfWeek);
        const mondayStr = monday.toISOString().split('T')[0];
        const weekRecords = await attendance_model_js_1.AttendanceModel.find({
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
        const monthLateRecords = await attendance_model_js_1.AttendanceModel.countDocuments({
            employeeId,
            date: { $regex: `^${currentMonth}` },
            status: 'late',
        });
        lateCountMonth = monthLateRecords;
        const weeklyHours = (0, money_js_1.round2)(totalWorkedMinutes / 60);
        // 3. Leave Balances Summary
        const annualLeaves = await leave_model_js_1.LeaveRequestModel.find({
            employeeId,
            status: 'approved',
        }).lean();
        let annualUsed = 0;
        let sickUsed = 0;
        let casualUsed = 0;
        for (const l of annualLeaves) {
            if (l.leaveTypeKey === 'annual')
                annualUsed += l.workingDays;
            else if (l.leaveTypeKey === 'sick')
                sickUsed += l.workingDays;
            else if (l.leaveTypeKey === 'casual')
                casualUsed += l.workingDays;
        }
        const leaveBalances = [
            { key: 'annual', name: 'Annual Leave', remaining: Math.max(0, 14 - annualUsed), quota: 14 },
            { key: 'sick', name: 'Sick Leave', remaining: Math.max(0, 8 - sickUsed), quota: 8 },
            { key: 'casual', name: 'Casual Leave', remaining: Math.max(0, 10 - casualUsed), quota: 10 },
        ];
        // 4. Last Payslip
        const lastPayslip = await payroll_model_js_1.PayslipModel.findOne({ employeeId })
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
exports.AnalyticsService = AnalyticsService;
