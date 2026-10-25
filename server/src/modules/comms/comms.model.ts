import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncement extends Document {
  title: string;
  body: string;
  postedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'leave' | 'attendance' | 'payroll' | 'general';
  title: string;
  body: string;
  link?: string;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

AnnouncementSchema.index({ createdAt: -1 });

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['leave', 'attendance', 'payroll', 'general'], default: 'general' },
    title: { type: String, required: true },
    body: { type: String, required: true },
    link: { type: String },
    readAt: { type: Date },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, readAt: 1 });
NotificationSchema.index({ createdAt: -1 });

export const AnnouncementModel = mongoose.model<IAnnouncement>(
  'Announcement',
  AnnouncementSchema,
  'announcements'
);

export const NotificationModel = mongoose.model<INotification>(
  'Notification',
  NotificationSchema,
  'notifications'
);
