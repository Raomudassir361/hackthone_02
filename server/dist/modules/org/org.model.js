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
exports.HolidayModel = exports.LeaveTypeModel = exports.DesignationModel = exports.DepartmentModel = exports.SettingsModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const settingsSchema = new mongoose_1.Schema({
    companyName: { type: String, required: true },
    timezone: { type: String, default: 'Asia/Karachi' },
    officeStart: { type: String, default: '09:00' },
    graceMinutes: { type: Number, default: 15 },
    halfDayHours: { type: Number, default: 5 },
    weekendDays: { type: [Number], default: [0, 6] },
    officeLat: { type: Number, default: 24.8607 },
    officeLng: { type: Number, default: 67.0011 },
    officeRadiusM: { type: Number, default: 150 },
    hraPct: { type: Number, default: 40 },
    medicalPct: { type: Number, default: 10 },
    setupComplete: { type: Boolean, default: false },
}, {
    timestamps: true,
});
exports.SettingsModel = mongoose_1.default.model('Settings', settingsSchema, 'settings');
exports.DepartmentModel = mongoose_1.default.model('Department', new mongoose_1.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, trim: true },
}, { timestamps: true }), 'departments');
exports.DesignationModel = mongoose_1.default.model('Designation', new mongoose_1.Schema({
    title: { type: String, required: true, unique: true, trim: true },
}, { timestamps: true }), 'designations');
exports.LeaveTypeModel = mongoose_1.default.model('LeaveType', new mongoose_1.Schema({
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    yearlyQuota: { type: Number, default: null },
    isPaid: { type: Boolean, default: true },
}, { timestamps: true }), 'leave_types');
exports.HolidayModel = mongoose_1.default.model('Holiday', new mongoose_1.Schema({
    date: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
}, { timestamps: true }), 'holidays');
