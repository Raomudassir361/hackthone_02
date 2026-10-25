"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commsRouter = void 0;
const express_1 = require("express");
const comms_controller_js_1 = require("./comms.controller.js");
const auth_js_1 = require("../../middleware/auth.js");
const validate_js_1 = require("../../middleware/validate.js");
const zod_1 = require("zod");
const CreateAnnouncementSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(2, 'Title must be at least 2 characters'),
        body: zod_1.z.string().min(5, 'Announcement body must be at least 5 characters'),
    }),
});
exports.commsRouter = (0, express_1.Router)();
exports.commsRouter.use(auth_js_1.authenticate, auth_js_1.mustChangePasswordGuard);
// 1. Announcements
exports.commsRouter.get('/announcements', comms_controller_js_1.CommsController.getAnnouncements);
exports.commsRouter.post('/announcements', (0, auth_js_1.requireRole)(['admin', 'hr']), (0, validate_js_1.validate)(CreateAnnouncementSchema), comms_controller_js_1.CommsController.createAnnouncement);
// 2. Notifications
exports.commsRouter.get('/notifications', comms_controller_js_1.CommsController.getMyNotifications);
exports.commsRouter.post('/notifications/:id/read', comms_controller_js_1.CommsController.markNotificationRead);
// 3. Audit Log (Admin Only)
exports.commsRouter.get('/audit', (0, auth_js_1.requireRole)(['admin']), comms_controller_js_1.CommsController.getAuditLogs);
