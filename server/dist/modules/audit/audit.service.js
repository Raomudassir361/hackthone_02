"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const audit_model_js_1 = require("./audit.model.js");
class AuditService {
    static async log(params) {
        try {
            await audit_model_js_1.AuditLogModel.create({
                actorId: new mongoose_1.default.Types.ObjectId(params.actorId),
                actorRole: params.actorRole,
                action: params.action,
                entity: params.entity,
                entityId: params.entityId,
                before: params.before,
                after: params.after,
                ip: params.ip,
                at: new Date(),
            });
        }
        catch (err) {
            console.error('Failed to write audit log:', err);
        }
    }
    /**
     * GET /api/audit (Admin only, filtered by action, entity, actorId, date range)
     */
    static async getLogs(filter) {
        const query = {};
        if (filter.action) {
            query.action = filter.action;
        }
        if (filter.entity) {
            query.entity = filter.entity;
        }
        if (filter.from || filter.to) {
            const dateQuery = {};
            if (filter.from)
                dateQuery.$gte = new Date(filter.from);
            if (filter.to)
                dateQuery.$lte = new Date(filter.to);
            query.createdAt = dateQuery;
        }
        return audit_model_js_1.AuditLogModel.find(query)
            .populate('actorId', 'email role')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
    }
}
exports.AuditService = AuditService;
