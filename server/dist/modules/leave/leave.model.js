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
exports.LeaveRequestModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const leaveRequestSchema = new mongoose_1.Schema({
    employeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    leaveTypeKey: { type: String, required: true, lowercase: true, trim: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    workingDays: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, trim: true },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending',
    },
    decidedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    decisionComment: { type: String, trim: true },
    decidedAt: { type: Date },
    source: { type: String, enum: ['form', 'ai'], default: 'form' },
}, {
    timestamps: true,
});
leaveRequestSchema.index({ employeeId: 1, startDate: 1 });
leaveRequestSchema.index({ status: 1 });
leaveRequestSchema.index({ employeeId: 1, status: 1 });
exports.LeaveRequestModel = mongoose_1.default.model('LeaveRequest', leaveRequestSchema, 'leave_requests');
