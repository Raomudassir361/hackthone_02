"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommsController = void 0;
const comms_service_js_1 = require("./comms.service.js");
const audit_service_js_1 = require("../audit/audit.service.js");
class CommsController {
    static async createAnnouncement(req, res, next) {
        try {
            const announcement = await comms_service_js_1.CommsService.createAnnouncement(req.body, req.ctx);
            res.status(201).json({ success: true, data: announcement });
        }
        catch (err) {
            next(err);
        }
    }
    static async getAnnouncements(_req, res, next) {
        try {
            const announcements = await comms_service_js_1.CommsService.getAnnouncements();
            res.json({ success: true, data: announcements });
        }
        catch (err) {
            next(err);
        }
    }
    static async getMyNotifications(req, res, next) {
        try {
            const notifications = await comms_service_js_1.CommsService.getMyNotifications(req.ctx);
            res.json({ success: true, data: notifications });
        }
        catch (err) {
            next(err);
        }
    }
    static async markNotificationRead(req, res, next) {
        try {
            const notification = await comms_service_js_1.CommsService.markNotificationRead(req.params.id, req.ctx);
            res.json({ success: true, data: notification });
        }
        catch (err) {
            next(err);
        }
    }
    static async getAuditLogs(req, res, next) {
        try {
            const logs = await audit_service_js_1.AuditService.getLogs({
                action: req.query.action,
                entity: req.query.entity,
                from: req.query.from,
                to: req.query.to,
            });
            res.json({ success: true, data: logs });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.CommsController = CommsController;
