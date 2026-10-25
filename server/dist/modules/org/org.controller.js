"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgController = void 0;
const org_service_js_1 = require("./org.service.js");
class OrgController {
    // Settings
    static async getSettings(_req, res, next) {
        try {
            const data = await org_service_js_1.OrgService.getSettings();
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async updateSettings(req, res, next) {
        try {
            const data = await org_service_js_1.OrgService.updateSettings(req.ctx, req.body, req.ip);
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    // Departments
    static async getDepartments(_req, res, next) {
        try {
            const data = await org_service_js_1.OrgService.getDepartments();
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async createDepartment(req, res, next) {
        try {
            const data = await org_service_js_1.OrgService.createDepartment(req.ctx, req.body, req.ip);
            res.status(201).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async updateDepartment(req, res, next) {
        try {
            const data = await org_service_js_1.OrgService.updateDepartment(req.ctx, req.params.id, req.body, req.ip);
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async deleteDepartment(req, res, next) {
        try {
            const data = await org_service_js_1.OrgService.deleteDepartment(req.ctx, req.params.id, req.ip);
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    // Designations
    static async getDesignations(_req, res, next) {
        try {
            const data = await org_service_js_1.OrgService.getDesignations();
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async createDesignation(req, res, next) {
        try {
            const data = await org_service_js_1.OrgService.createDesignation(req.ctx, req.body, req.ip);
            res.status(201).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    // Leave Types
    static async getLeaveTypes(_req, res, next) {
        try {
            const data = await org_service_js_1.OrgService.getLeaveTypes();
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async createLeaveType(req, res, next) {
        try {
            const data = await org_service_js_1.OrgService.createLeaveType(req.ctx, req.body, req.ip);
            res.status(201).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    // Holidays
    static async getHolidays(_req, res, next) {
        try {
            const data = await org_service_js_1.OrgService.getHolidays();
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async createHoliday(req, res, next) {
        try {
            const data = await org_service_js_1.OrgService.createHoliday(req.ctx, req.body, req.ip);
            res.status(201).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async deleteHoliday(req, res, next) {
        try {
            const data = await org_service_js_1.OrgService.deleteHoliday(req.ctx, req.params.id, req.ip);
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
}
exports.OrgController = OrgController;
