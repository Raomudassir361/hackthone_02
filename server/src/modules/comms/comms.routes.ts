import { Router } from 'express';
import { CommsController } from './comms.controller.js';
import { authenticate, requireRole, mustChangePasswordGuard } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { z } from 'zod';

const CreateAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(2, 'Title must be at least 2 characters'),
    body: z.string().min(5, 'Announcement body must be at least 5 characters'),
  }),
});

export const commsRouter = Router();

commsRouter.use(authenticate, mustChangePasswordGuard);

// 1. Announcements
commsRouter.get('/announcements', CommsController.getAnnouncements);
commsRouter.post(
  '/announcements',
  requireRole(['admin', 'hr']),
  validate(CreateAnnouncementSchema),
  CommsController.createAnnouncement
);

// 2. Notifications
commsRouter.get('/notifications', CommsController.getMyNotifications);
commsRouter.post('/notifications/:id/read', CommsController.markNotificationRead);

// 3. Audit Log (Admin Only)
commsRouter.get('/audit', requireRole(['admin']), CommsController.getAuditLogs);
