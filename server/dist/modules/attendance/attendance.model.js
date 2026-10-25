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
exports.AttendanceCorrectionModel = exports.AttendanceModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const attendanceSchema = new mongoose_1.Schema({
    employeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    checkInAt: { type: Date, required: true },
    checkOutAt: { type: Date },
    status: {
        type: String,
        enum: ['present', 'late', 'half_day', 'missing_checkout', 'on_leave'],
        required: true,
    },
    workedMinutes: { type: Number, default: 0 },
    source: { type: String, enum: ['web', 'camera', 'correction'], default: 'web' },
    isWorkingDay: { type: Boolean, default: true },
    ruleSnapshot: {
        officeStart: { type: String, required: true },
        graceMinutes: { type: Number, required: true },
        halfDayHours: { type: Number, required: true },
    },
    location: {
        lat: Number,
        lng: Number,
        distanceMeters: Number,
    },
    correctionId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'AttendanceCorrection' },
}, {
    timestamps: true,
});
// CRITICAL RULE: One record per employee per day
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ employeeId: 1 });
exports.AttendanceModel = mongoose_1.default.model('Attendance', attendanceSchema, 'attendance');
const correctionSchema = new mongoose_1.Schema({
    employeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: String, required: true },
    requestedCheckIn: { type: Date },
    requestedCheckOut: { type: Date },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    decidedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    decisionComment: { type: String, trim: true },
    decidedAt: { type: Date },
}, {
    timestamps: true,
});
correctionSchema.index({ employeeId: 1, status: 1 });
correctionSchema.index({ status: 1 });
exports.AttendanceCorrectionModel = mongoose_1.default.model('AttendanceCorrection', correctionSchema, 'attendance_corrections');
