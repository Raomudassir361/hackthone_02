import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  actorId: mongoose.Types.ObjectId;
  actorRole: 'admin' | 'hr' | 'employee' | 'system';
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  at: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, required: true },
    actorRole: { type: String, enum: ['admin', 'hr', 'employee', 'system'], required: true },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ip: { type: String },
    at: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
  }
);

auditLogSchema.index({ at: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ actorId: 1 });

// Critical rule: Audit log is strictly append-only.
// Prevent updates and deletions at schema level.
auditLogSchema.pre('updateOne', function () {
  throw new Error('Audit log is immutable: update is forbidden');
});
auditLogSchema.pre('updateMany', function () {
  throw new Error('Audit log is immutable: update is forbidden');
});
auditLogSchema.pre('deleteOne', function () {
  throw new Error('Audit log is immutable: delete is forbidden');
});
auditLogSchema.pre('deleteMany', function () {
  throw new Error('Audit log is immutable: delete is forbidden');
});
auditLogSchema.pre('findOneAndDelete', function () {
  throw new Error('Audit log is immutable: delete is forbidden');
});
auditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('Audit log is immutable: update is forbidden');
});

export const AuditLogModel = mongoose.model<IAuditLog>('AuditLog', auditLogSchema, 'audit_logs');
