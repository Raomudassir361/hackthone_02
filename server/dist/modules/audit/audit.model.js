"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const auditLogSchema = new mongoose_1.Schema({
    actorId: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    actorRole: { type: String, enum: ['admin', 'hr', 'employee', 'system'], required: true },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String },
    before: { type: mongoose_1.Schema.Types.Mixed },
    after: { type: mongoose_1.Schema.Types.Mixed },
    ip: { type: String },
    at: { type: Date, default: Date.now },
}, {
    timestamps: false,
});
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
exports.AuditLogModel = mongoose_1.default.model('AuditLog', auditLogSchema, 'audit_logs');
