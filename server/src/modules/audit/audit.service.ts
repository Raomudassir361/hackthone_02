import mongoose from 'mongoose';
import { AuditLogModel } from './audit.model.js';

export interface AuditLogParams {
  actorId: mongoose.Types.ObjectId | string;
  actorRole: 'admin' | 'hr' | 'employee' | 'system';
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}

export class AuditService {
  public static async log(params: AuditLogParams): Promise<void> {
    try {
      await AuditLogModel.create({
        actorId: new mongoose.Types.ObjectId(params.actorId),
        actorRole: params.actorRole,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        before: params.before,
        after: params.after,
        ip: params.ip,
        at: new Date(),
      });
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  }

  /**
   * GET /api/audit (Admin only, filtered by action, entity, actorId, date range)
   */
  public static async getLogs(filter: {
    action?: string;
    entity?: string;
    from?: string;
    to?: string;
  }) {
    const query: Record<string, unknown> = {};

    if (filter.action) {
      query.action = filter.action;
    }
    if (filter.entity) {
      query.entity = filter.entity;
    }
    if (filter.from || filter.to) {
      const dateQuery: Record<string, unknown> = {};
      if (filter.from) dateQuery.$gte = new Date(filter.from);
      if (filter.to) dateQuery.$lte = new Date(filter.to);
      query.createdAt = dateQuery;
    }

    return AuditLogModel.find(query)
      .populate('actorId', 'email role')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
  }
}
