"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const analytics_service_js_1 = require("./analytics.service.js");
class DashboardController {
    static async getHrDashboard(req, res, next) {
        try {
            const data = await analytics_service_js_1.AnalyticsService.getHrDashboard({
                from: req.query.from,
                to: req.query.to,
                departmentId: req.query.departmentId,
            });
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    }
    static async getAdminDashboard(req, res, next) {
        try {
            const data = await analytics_service_js_1.AnalyticsService.getAdminDashboard({
                from: req.query.from,
                to: req.query.to,
                departmentId: req.query.departmentId,
            });
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    }
    static async getEmployeeDashboard(req, res, next) {
        try {
            const data = await analytics_service_js_1.AnalyticsService.getEmployeeDashboard(req.ctx);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.DashboardController = DashboardController;
