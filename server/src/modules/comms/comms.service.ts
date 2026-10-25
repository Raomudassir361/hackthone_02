import mongoose from 'mongoose';
import { AnnouncementModel, NotificationModel } from './comms.model.js';
import { RequestContext } from '../../middleware/auth.js';
import { AuditService } from '../audit/audit.service.js';
import { AppError } from '../../shared/errors.js';

export class CommsService {
  /**
   * POST /api/announcements (Admin/HR only)
   */
  public static async createAnnouncement(
    data: { title: string; body: string },
    ctx: RequestContext
  ) {
    const announcement = await AnnouncementModel.create({
      title: data.title,
      body: data.body,
      postedBy: new mongoose.Types.ObjectId(ctx.userId),
    });

    await AuditService.log({
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: 'ANNOUNCEMENT_CREATED',
      entity: 'Announcement',
      entityId: (announcement._id as mongoose.Types.ObjectId).toString(),
      after: { title: data.title },
    });

    return announcement;
  }

  /**
   * GET /api/announcements (All authenticated users)
   */
  public static async getAnnouncements() {
    return AnnouncementModel.find()
      .populate('postedBy', 'email role')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Helper: System emits in-app notification to a user.
   */
  public static async createNotification(params: {
    userId: mongoose.Types.ObjectId | string;
    type: 'leave' | 'attendance' | 'payroll' | 'general';
    title: string;
    body: string;
    link?: string;
  }) {
    return NotificationModel.create({
      userId: new mongoose.Types.ObjectId(params.userId),
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link,
    });
  }

  /**
   * GET /api/notifications (User's own notifications)
   */
  public static async getMyNotifications(ctx: RequestContext) {
    return NotificationModel.find({
      userId: new mongoose.Types.ObjectId(ctx.userId),
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
  }

  /**
   * POST /api/notifications/:id/read (Marks single notification as read)
   */
  public static async markNotificationRead(id: string, ctx: RequestContext) {
    const notif = await NotificationModel.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(ctx.userId),
    });

    if (!notif) {
      throw new AppError('NOT_FOUND', 404, 'Notification not found');
    }

    notif.readAt = new Date();
    await notif.save();
    return notif;
  }
}
