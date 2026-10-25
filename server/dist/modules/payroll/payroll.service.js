"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const errors_js_1 = require("../../shared/errors.js");
const payroll_model_js_1 = require("./payroll.model.js");
const employee_model_js_1 = require("../employees/employee.model.js");
const attendance_model_js_1 = require("../attendance/attendance.model.js");
const leave_model_js_1 = require("../leave/leave.model.js");
const org_model_js_1 = require("../org/org.model.js");
const audit_service_js_1 = require("../audit/audit.service.js");
const workingDays_js_1 = require("../../shared/workingDays.js");
const money_js_1 = require("../../shared/money.js");
const payroll_calc_js_1 = require("./payroll.calc.js");
const payroll_pdf_js_1 = require("./payroll.pdf.js");
class PayrollService {
    /**
     * Helper: Resolves start date, end date, and total working days in a month (YYYY-MM).
     */
    static async getMonthWorkingDays(month, weekendDays) {
        const [yearStr, monthStr] = month.split('-');
        const year = parseInt(yearStr, 10);
        const mIndex = parseInt(monthStr, 10) - 1;
        const startDate = `${month}-01`;
        const lastDayNum = new Date(Date.UTC(year, mIndex + 1, 0)).getUTCDate();
        const endDate = `${month}-${String(lastDayNum).padStart(2, '0')}`;
        const holidays = await org_model_js_1.HolidayModel.find({
            date: { $gte: startDate, $lte: endDate },
        }).lean();
        const holidayDates = holidays.map((h) => h.date);
        const workingDays = (0, workingDays_js_1.countWorkingDays)({ startDate, endDate, weekendDays, holidayDates });
        return { startDate, endDate, workingDays, holidayDates };
    }
    /**
     * Helper: Computes attendance days for an employee during the month.
     */
    static async computeEmployeeAttendanceStats(employeeId, startDate, endDate, weekendDays, holidayDates, joinDateStr, exitDateStr) {
        // 1. Fetch attendance records for this employee in month
        const attendanceRecords = await attendance_model_js_1.AttendanceModel.find({
            employeeId,
            date: { $gte: startDate, $lte: endDate },
        }).lean();
        // 2. Fetch approved leaves for this employee overlapping month
        const approvedLeaves = await leave_model_js_1.LeaveRequestModel.find({
            employeeId,
            status: 'approved',
            startDate: { $lte: endDate },
            endDate: { $gte: startDate },
        }).lean();
        // Set of dates on approved leave
        const paidLeaveDates = new Set();
        const unpaidLeaveDates = new Set();
        for (const l of approvedLeaves) {
            // Loop through range and collect dates
            const curr = new Date(`${l.startDate}T00:00:00Z`);
            const end = new Date(`${l.endDate}T00:00:00Z`);
            while (curr <= end) {
                const dateStr = curr.toISOString().split('T')[0];
                if (dateStr >= startDate && dateStr <= endDate) {
                    if (l.leaveTypeKey === 'unpaid') {
                        unpaidLeaveDates.add(dateStr);
                    }
                    else {
                        paidLeaveDates.add(dateStr);
                    }
                }
                curr.setUTCDate(curr.getUTCDate() + 1);
            }
        }
        // Map attendance records by date
        const attendanceMap = new Map();
        for (const att of attendanceRecords) {
            attendanceMap.set(att.date, att);
        }
        let absentDays = 0;
        let unpaidDays = 0;
        let halfDays = 0;
        let proratedDeductionDays = 0;
        const curr = new Date(`${startDate}T00:00:00Z`);
        const end = new Date(`${endDate}T00:00:00Z`);
        while (curr <= end) {
            const dateStr = curr.toISOString().split('T')[0];
            const dayOfWeek = curr.getUTCDay();
            const isWeekend = weekendDays.includes(dayOfWeek);
            const isHoliday = holidayDates.includes(dateStr);
            // We only evaluate working days for deductions
            if (!isWeekend && !isHoliday) {
                // Check join / exit date proration
                const isBeforeJoin = dateStr < joinDateStr;
                const isAfterExit = exitDateStr ? dateStr > exitDateStr : false;
                if (isBeforeJoin || isAfterExit) {
                    proratedDeductionDays += 1;
                }
                else if (unpaidLeaveDates.has(dateStr)) {
                    unpaidDays += 1;
                }
                else if (paidLeaveDates.has(dateStr)) {
                    // covered by approved paid leave -> 0 deduction
                }
                else {
                    const att = attendanceMap.get(dateStr);
                    if (!att) {
                        // No record and no leave on working day -> absent
                        absentDays += 1;
                    }
                    else if (att.status === 'half_day') {
                        halfDays += 1;
                    }
                }
            }
            curr.setUTCDate(curr.getUTCDate() + 1);
        }
        return { absentDays, unpaidDays, halfDays, proratedDeductionDays };
    }
    /**
     * Generates or regenerates payroll lines for a month.
     */
    static async computePayrollRunLines(month) {
        const settings = await org_model_js_1.SettingsModel.findOne().lean();
        const weekendDays = settings?.weekendDays || [0, 6];
        const hraPct = settings?.hraPct ?? 40;
        const medicalPct = settings?.medicalPct ?? 10;
        const { startDate, endDate, workingDays, holidayDates } = await this.getMonthWorkingDays(month, weekendDays);
        // Active or probation employees, or employees who were active at any point in this month
        const employees = await employee_model_js_1.EmployeeModel.find({
            joinDate: { $lte: endDate },
            $or: [
                { exitDate: { $exists: false } },
                { exitDate: null },
                { exitDate: { $gte: startDate } },
            ],
            status: { $in: ['active', 'probation', 'exited'] },
        })
            .populate('departmentId', 'name')
            .populate('designationId', 'title')
            .lean();
        const lines = [];
        let totalGross = 0;
        let totalDeductions = 0;
        let totalTax = 0;
        let totalNet = 0;
        for (const emp of employees) {
            const stats = await this.computeEmployeeAttendanceStats(emp._id, startDate, endDate, weekendDays, holidayDates, emp.joinDate, emp.exitDate);
            const calc = (0, payroll_calc_js_1.calculatePayrollLine)({
                basicSalary: emp.basicSalary,
                workingDaysInMonth: workingDays,
                absentDays: stats.absentDays,
                unpaidLeaveDays: stats.unpaidDays,
                halfDays: stats.halfDays,
                proratedDeductionDays: stats.proratedDeductionDays,
                hraPct,
                medicalPct,
            });
            const dept = emp.departmentId;
            const desig = emp.designationId;
            const line = {
                employeeId: emp._id,
                employeeCode: emp.code,
                employeeName: emp.name,
                departmentName: dept?.name || 'General',
                designationTitle: desig?.title || 'Associate',
                basic: calc.basic,
                hra: calc.hra,
                medical: calc.medical,
                gross: calc.gross,
                workingDays: calc.workingDays,
                perDayRate: calc.perDayRate,
                absentDays: calc.absentDays,
                unpaidDays: calc.unpaidDays,
                halfDays: calc.halfDays,
                deductionDays: calc.deductionDays,
                deductionAmount: calc.deductionAmount,
                annualTaxable: calc.annualTaxable,
                annualTax: calc.annualTax,
                monthlyTax: calc.monthlyTax,
                net: calc.net,
            };
            lines.push(line);
            totalGross += calc.gross;
            totalDeductions += calc.deductionAmount;
            totalTax += calc.monthlyTax;
            totalNet += calc.net;
        }
        const totals = {
            gross: (0, money_js_1.round2)(totalGross),
            deductions: (0, money_js_1.round2)(totalDeductions),
            tax: (0, money_js_1.round2)(totalTax),
            net: (0, money_js_1.round2)(totalNet),
            employeeCount: lines.length,
        };
        return { lines, totals };
    }
    /**
     * POST /api/payroll/runs (HR creates draft; 409 if duplicate month)
     */
    static async createDraftRun(month, ctx) {
        const existing = await payroll_model_js_1.PayrollRunModel.findOne({ month });
        if (existing) {
            throw new errors_js_1.AppError('DUPLICATE_PAYROLL_RUN', 409, `A payroll run already exists for month ${month}. Use regenerate to update the draft.`);
        }
        const { lines, totals } = await this.computePayrollRunLines(month);
        const run = await payroll_model_js_1.PayrollRunModel.create({
            month,
            status: 'draft',
            createdBy: new mongoose_1.default.Types.ObjectId(ctx.userId),
            totals,
            lines,
        });
        await audit_service_js_1.AuditService.log({
            actorId: ctx.userId,
            actorRole: ctx.role,
            action: 'PAYROLL_DRAFT_CREATED',
            entity: 'PayrollRun',
            entityId: run._id.toString(),
            after: { month, totals },
        });
        return run;
    }
    /**
     * GET /api/payroll/runs
     */
    static async getRuns() {
        return payroll_model_js_1.PayrollRunModel.find()
            .select('-lines')
            .sort({ month: -1 })
            .lean();
    }
    /**
     * GET /api/payroll/runs/:id
     */
    static async getRunById(id) {
        const run = await payroll_model_js_1.PayrollRunModel.findById(id).lean();
        if (!run) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'Payroll run not found');
        }
        return run;
    }
    /**
     * POST /api/payroll/runs/:id/regenerate (draft only; 409 if finalized)
     */
    static async regenerateDraftRun(id, ctx) {
        const run = await payroll_model_js_1.PayrollRunModel.findById(id);
        if (!run) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'Payroll run not found');
        }
        if (run.status === 'finalized') {
            throw new errors_js_1.AppError('PAYROLL_LOCKED', 409, 'Cannot regenerate a finalized payroll run. Finalized runs are permanently locked.');
        }
        const { lines, totals } = await this.computePayrollRunLines(run.month);
        run.lines = lines;
        run.totals = totals;
        await run.save();
        await audit_service_js_1.AuditService.log({
            actorId: ctx.userId,
            actorRole: ctx.role,
            action: 'PAYROLL_DRAFT_REGENERATED',
            entity: 'PayrollRun',
            entityId: id,
            after: { month: run.month, totals },
        });
        return run;
    }
    /**
     * POST /api/payroll/runs/:id/finalize (Admin only; 409 if already finalized)
     */
    static async finalizeRun(id, ctx) {
        const run = await payroll_model_js_1.PayrollRunModel.findById(id);
        if (!run) {
            throw new errors_js_1.AppError('Payroll run not found', 404, 'NOT_FOUND');
        }
        if (run.status === 'finalized') {
            throw new errors_js_1.AppError('ALREADY_FINALIZED', 409, 'This payroll run is already finalized and locked.');
        }
        run.status = 'finalized';
        run.finalizedBy = new mongoose_1.default.Types.ObjectId(ctx.userId);
        run.finalizedAt = new Date();
        await run.save();
        // Materialize individual snapshot payslips in `payslips` collection
        const payslipDocs = run.lines.map((line) => ({
            runId: run._id,
            employeeId: line.employeeId,
            month: run.month,
            basic: line.basic,
            hra: line.hra,
            medical: line.medical,
            gross: line.gross,
            workingDays: line.workingDays,
            absentDays: line.absentDays,
            unpaidDays: line.unpaidDays,
            halfDays: line.halfDays,
            deductionDays: line.deductionDays,
            deductionAmount: line.deductionAmount,
            annualTaxable: line.annualTaxable,
            monthlyTax: line.monthlyTax,
            net: line.net,
        }));
        // Upsert payslips
        for (const doc of payslipDocs) {
            await payroll_model_js_1.PayslipModel.findOneAndUpdate({ runId: doc.runId, employeeId: doc.employeeId }, { $set: doc }, { upsert: true, new: true });
        }
        await audit_service_js_1.AuditService.log({
            actorId: ctx.userId,
            actorRole: ctx.role,
            action: 'PAYROLL_FINALIZED',
            entity: 'PayrollRun',
            entityId: id,
            after: { month: run.month, totals: run.totals, finalizedAt: run.finalizedAt },
        });
        return run;
    }
    /**
     * GET /api/payslips (Scoped: Employee sees own; Admin/HR see all)
     */
    static async getPayslips(ctx) {
        const query = {};
        if (ctx.role === 'employee') {
            if (!ctx.employeeId) {
                return [];
            }
            query.employeeId = new mongoose_1.default.Types.ObjectId(ctx.employeeId);
        }
        return payroll_model_js_1.PayslipModel.find(query)
            .populate('employeeId', 'name code departmentId designationId')
            .sort({ month: -1 })
            .lean();
    }
    /**
     * GET /api/payslips/:id/pdf (Streams PDF; strict ownership check)
     */
    static async getPayslipPdf(id, ctx) {
        const payslip = await payroll_model_js_1.PayslipModel.findById(id)
            .populate('employeeId', 'name code departmentId designationId')
            .lean();
        if (!payslip) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'Payslip not found');
        }
        // Role scope security: Employee can only download their own payslip
        if (ctx.role === 'employee') {
            if (!ctx.employeeId || payslip.employeeId._id.toString() !== ctx.employeeId) {
                throw new errors_js_1.AppError('NOT_FOUND', 404, 'Payslip not found');
            }
        }
        const settings = await org_model_js_1.SettingsModel.findOne().lean();
        const companyName = settings?.companyName || 'HCM Lite Inc.';
        const emp = payslip.employeeId;
        const payslipLine = {
            employeeId: emp._id,
            employeeCode: emp.code,
            employeeName: emp.name,
            departmentName: emp.departmentId?.name,
            designationTitle: emp.designationId?.title,
            basic: payslip.basic,
            hra: payslip.hra,
            medical: payslip.medical,
            gross: payslip.gross,
            workingDays: payslip.workingDays,
            perDayRate: (0, money_js_1.round2)(payslip.gross / (payslip.workingDays || 1)),
            absentDays: payslip.absentDays,
            unpaidDays: payslip.unpaidDays,
            halfDays: payslip.halfDays,
            deductionDays: payslip.deductionDays,
            deductionAmount: payslip.deductionAmount,
            annualTaxable: payslip.annualTaxable,
            annualTax: (0, money_js_1.round2)(payslip.monthlyTax * 12),
            monthlyTax: payslip.monthlyTax,
            net: payslip.net,
        };
        const doc = (0, payroll_pdf_js_1.generatePayslipPdfStream)(payslipLine, {
            companyName,
            month: payslip.month,
            generatedDate: new Date().toISOString().split('T')[0],
        });
        return { doc, filename: `payslip-${payslip.month}-${emp.code}.pdf` };
    }
}
exports.PayrollService = PayrollService;
