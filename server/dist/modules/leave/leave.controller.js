"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveController = void 0;
const leave_service_js_1 = require("./leave.service.js");
class LeaveController {
    static async calculateWorkingDays(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            const days = await leave_service_js_1.LeaveService.calculateLeaveWorkingDays(startDate, endDate);
            res.status(200).json({ data: { workingDays: days } });
        }
        catch (e) {
            next(e);
        }
    }
    static async getBalance(req, res, next) {
        try {
            const employeeId = req.query.employeeId;
            const data = await leave_service_js_1.LeaveService.getLeaveBalance(req.ctx, employeeId);
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async applyLeave(req, res, next) {
        try {
            const data = await leave_service_js_1.LeaveService.applyLeave(req.ctx, req.body, req.ip);
            res.status(201).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async getLeaveRequests(req, res, next) {
        try {
            const status = req.query.status;
            const employeeId = req.query.employeeId;
            const data = await leave_service_js_1.LeaveService.getLeaveRequests(req.ctx, { status, employeeId });
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async getLeaveInbox(req, res, next) {
        try {
            const data = await leave_service_js_1.LeaveService.getLeaveInbox(req.ctx);
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async decideLeave(req, res, next) {
        try {
            const data = await leave_service_js_1.LeaveService.decideLeave(req.ctx, req.params.id, req.body, req.ip);
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async cancelLeave(req, res, next) {
        try {
            const data = await leave_service_js_1.LeaveService.cancelLeave(req.ctx, req.params.id, req.ip);
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
}
exports.LeaveController = LeaveController;
