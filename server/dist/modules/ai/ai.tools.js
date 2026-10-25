"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiToolsExecutor = exports.AI_TOOLS = void 0;
const analytics_service_js_1 = require("../analytics/analytics.service.js");
const leave_service_js_1 = require("../leave/leave.service.js");
const employee_model_js_1 = require("../employees/employee.model.js");
const payroll_model_js_1 = require("../payroll/payroll.model.js");
exports.AI_TOOLS = [
    {
        name: 'get_headcount',
        description: 'Get company or department headcount. Denied to employees.',
        parameters: {
            type: 'object',
            properties: {
                departmentId: { type: 'string' },
                asOf: { type: 'string' },
            },
        },
    },
    {
        name: 'get_attendance_summary',
        description: 'Get attendance rate, present, late, absent counts.',
        parameters: {
            type: 'object',
            properties: {
                from: { type: 'string' },
                to: { type: 'string' },
                departmentId: { type: 'string' },
            },
        },
    },
    {
        name: 'get_late_comers',
        description: 'Get list of top employees with late check-ins. Denied to employees.',
        parameters: {
            type: 'object',
            properties: {
                from: { type: 'string' },
                to: { type: 'string' },
                limit: { type: 'number' },
            },
        },
    },
    {
        name: 'get_leave_summary',
        description: 'Get approved leave utilization by leave type.',
        parameters: {
            type: 'object',
            properties: {
                from: { type: 'string' },
                to: { type: 'string' },
                departmentId: { type: 'string' },
            },
        },
    },
    {
        name: 'get_my_leave_balance',
        description: 'Get current user leave quotas, used, pending, and remaining days.',
        parameters: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'get_payroll_summary',
        description: 'Get gross, net, and total deductions for a month.',
        parameters: {
            type: 'object',
            properties: {
                month: { type: 'string' },
            },
        },
    },
    {
        name: 'search_employees',
        description: 'Search employees by name or code. Never returns salary for non-admin/hr.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string' },
            },
            required: ['query'],
        },
    },
];
class AiToolsExecutor {
    static async execute(toolName, args, ctx) {
        switch (toolName) {
            case 'get_headcount': {
                // Employee scope: denied (policy answer instead)
                if (ctx.role === 'employee') {
                    return { error: 'Permission denied: Headcount statistics are reserved for HR and Administration.' };
                }
                const count = await analytics_service_js_1.AnalyticsService.getHeadcount(args.asOf, args.departmentId);
                return { count };
            }
            case 'get_attendance_summary': {
                const metrics = await analytics_service_js_1.AnalyticsService.getAttendanceMetrics({
                    from: args.from,
                    to: args.to,
                    departmentId: ctx.role === 'employee' ? undefined : args.departmentId,
                });
                return metrics;
            }
            case 'get_late_comers': {
                // Employee scope: denied
                if (ctx.role === 'employee') {
                    return { error: 'Permission denied: Late arrival records of other colleagues are confidential.' };
                }
                const lateComers = await analytics_service_js_1.AnalyticsService.getTopLateComers({
                    from: args.from,
                    to: args.to,
                }, args.limit || 5);
                return lateComers;
            }
            case 'get_leave_summary': {
                const leaveUtilization = await analytics_service_js_1.AnalyticsService.getLeaveUtilization({
                    from: args.from,
                    to: args.to,
                });
                return leaveUtilization;
            }
            case 'get_my_leave_balance': {
                if (!ctx.employeeId) {
                    return { error: 'No associated employee profile.' };
                }
                const balances = await leave_service_js_1.LeaveService.getLeaveBalance(ctx);
                return balances;
            }
            case 'get_payroll_summary': {
                if (ctx.role === 'employee') {
                    // Employee: own payslip summary only
                    if (!ctx.employeeId)
                        return { error: 'No employee record.' };
                    const payslip = await payroll_model_js_1.PayslipModel.findOne({ employeeId: ctx.employeeId })
                        .sort({ month: -1 })
                        .lean();
                    if (!payslip)
                        return { message: 'No payslip available yet.' };
                    return { month: payslip.month, gross: payslip.gross, net: payslip.net };
                }
                const run = await payroll_model_js_1.PayrollRunModel.findOne(args.month ? { month: args.month } : {})
                    .sort({ month: -1 })
                    .lean();
                if (!run)
                    return { message: 'No payroll runs created yet.' };
                return {
                    month: run.month,
                    totals: run.totals,
                    status: run.status,
                };
            }
            case 'search_employees': {
                const q = String(args.query || '');
                const emps = await employee_model_js_1.EmployeeModel.find({
                    $or: [
                        { name: { $regex: q, $options: 'i' } },
                        { code: { $regex: q, $options: 'i' } },
                    ],
                })
                    .limit(5)
                    .populate('departmentId', 'name')
                    .populate('designationId', 'title')
                    .lean();
                // Strip salary for non-admin/hr
                return emps.map((e) => {
                    const dept = e.departmentId;
                    const desig = e.designationId;
                    const out = {
                        code: e.code,
                        name: e.name,
                        department: dept?.name || 'General',
                        designation: desig?.title || 'Associate',
                    };
                    if (ctx.role === 'admin' || ctx.role === 'hr') {
                        out.basicSalary = e.basicSalary;
                    }
                    return out;
                });
            }
            default:
                return { error: `Tool ${toolName} not supported.` };
        }
    }
}
exports.AiToolsExecutor = AiToolsExecutor;
