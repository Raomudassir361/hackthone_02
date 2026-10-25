"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommsService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const comms_model_js_1 = require("./comms.model.js");
const audit_service_js_1 = require("../audit/audit.service.js");
const errors_js_1 = require("../../shared/errors.js");
class CommsService {
    /**
     * POST /api/announcements (Admin/HR only)
     */
    static async createAnnouncement(data, ctx) {
        const announcement = await comms_model_js_1.AnnouncementModel.create({
            title: data.title,
            body: data.body,
            postedBy: new mongoose_1.default.Types.ObjectId(ctx.userId),
        });
        await audit_service_js_1.AuditService.log({
            actorId: ctx.userId,
            actorRole: ctx.role,
            action: 'ANNOUNCEMENT_CREATED',
            entity: 'Announcement',
            entityId: announcement._id.toString(),
            after: { title: data.title },
        });
        return announcement;
    }
    /**
     * GET /api/announcements (All authenticated users)
     */
    static async getAnnouncements() {
        return comms_model_js_1.AnnouncementModel.find()
            .populate('postedBy', 'email role')
            .sort({ createdAt: -1 })
            .lean();
    }
    /**
     * Helper: System emits in-app notification to a user.
     */
    static async createNotification(params) {
        return comms_model_js_1.NotificationModel.create({
            userId: new mongoose_1.default.Types.ObjectId(params.userId),
            type: params.type,
            title: params.title,
            body: params.body,
            link: params.link,
        });
    }
    /**
     * GET /api/notifications (User's own notifications)
     */
    static async getMyNotifications(ctx) {
        return comms_model_js_1.NotificationModel.find({
            userId: new mongoose_1.default.Types.ObjectId(ctx.userId),
        })
            .sort({ createdAt: -1 })
            .limit(30)
            .lean();
    }
    /**
     * POST /api/notifications/:id/read (Marks single notification as read)
     */
    static async markNotificationRead(id, ctx) {
        const notif = await comms_model_js_1.NotificationModel.findOne({
            _id: id,
            userId: new mongoose_1.default.Types.ObjectId(ctx.userId),
        });
        if (!notif) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'Notification not found');
        }
        notif.readAt = new Date();
        await notif.save();
        return notif;
    }
}
exports.CommsService = CommsService;
