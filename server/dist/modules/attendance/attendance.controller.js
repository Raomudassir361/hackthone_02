"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceController = void 0;
const attendance_service_js_1 = require("./attendance.service.js");
class AttendanceController {
    static async checkIn(req, res, next) {
        try {
            const data = await attendance_service_js_1.AttendanceService.checkIn(req.ctx, req.body, req.ip);
            res.status(201).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async checkOut(req, res, next) {
        try {
            const data = await attendance_service_js_1.AttendanceService.checkOut(req.ctx, req.body, req.ip);
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async getCalendar(req, res, next) {
        try {
            const month = req.query.month;
            const employeeId = req.query.employeeId;
            const data = await attendance_service_js_1.AttendanceService.getCalendar(req.ctx, month, employeeId);
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async getBoard(req, res, next) {
        try {
            const date = req.query.date;
            const departmentId = req.query.departmentId;
            const data = await attendance_service_js_1.AttendanceService.getBoard(req.ctx, date, departmentId);
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async requestCorrection(req, res, next) {
        try {
            const data = await attendance_service_js_1.AttendanceService.requestCorrection(req.ctx, req.body, req.ip);
            res.status(201).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async getCorrections(req, res, next) {
        try {
            const status = req.query.status || 'pending';
            const data = await attendance_service_js_1.AttendanceService.getCorrections(req.ctx, status);
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async decideCorrection(req, res, next) {
        try {
            const data = await attendance_service_js_1.AttendanceService.decideCorrection(req.ctx, req.params.id, req.body, req.ip);
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
}
exports.AttendanceController = AttendanceController;
