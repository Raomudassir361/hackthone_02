import { Request, Response, NextFunction } from 'express';
import { CommsService } from './comms.service.js';
import { AuditService } from '../audit/audit.service.js';

export class CommsController {
  public static async createAnnouncement(req: Request, res: Response, next: NextFunction) {
    try {
      const announcement = await CommsService.createAnnouncement(req.body, req.ctx!);
      res.status(201).json({ success: true, data: announcement });
    } catch (err) {
      next(err);
    }
  }

  public static async getAnnouncements(_req: Request, res: Response, next: NextFunction) {
    try {
      const announcements = await CommsService.getAnnouncements();
      res.json({ success: true, data: announcements });
    } catch (err) {
      next(err);
    }
  }

  public static async getMyNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const notifications = await CommsService.getMyNotifications(req.ctx!);
      res.json({ success: true, data: notifications });
    } catch (err) {
      next(err);
    }
  }

  public static async markNotificationRead(req: Request, res: Response, next: NextFunction) {
    try {
      const notification = await CommsService.markNotificationRead(req.params.id, req.ctx!);
      res.json({ success: true, data: notification });
    } catch (err) {
      next(err);
    }
  }

  public static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const logs = await AuditService.getLogs({
        action: req.query.action as string,
        entity: req.query.entity as string,
        from: req.query.from as string,
        to: req.query.to as string,
      });
      res.json({ success: true, data: logs });
    } catch (err) {
      next(err);
    }
  }
}
