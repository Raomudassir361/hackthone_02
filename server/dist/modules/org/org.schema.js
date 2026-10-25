"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.holidaySchema = exports.leaveTypeSchema = exports.designationSchema = exports.departmentSchema = exports.updateSettingsSchema = void 0;
const zod_1 = require("zod");
exports.updateSettingsSchema = zod_1.z.object({
    body: zod_1.z.object({
        companyName: zod_1.z.string().min(1).optional(),
        timezone: zod_1.z.string().optional(),
        officeStart: zod_1.z.string().regex(/^\d{2}:\d{2}$/, 'Must be in HH:MM format').optional(),
        graceMinutes: zod_1.z.number().int().min(0).max(120).optional(),
        halfDayHours: zod_1.z.number().min(1).max(12).optional(),
        weekendDays: zod_1.z.array(zod_1.z.number().int().min(0).max(6)).optional(),
        officeLat: zod_1.z.number().optional(),
        officeLng: zod_1.z.number().optional(),
        officeRadiusM: zod_1.z.number().min(10).optional(),
        hraPct: zod_1.z.number().min(0).max(100).optional(),
        medicalPct: zod_1.z.number().min(0).max(100).optional(),
    }),
});
exports.departmentSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Department name is required'),
        code: zod_1.z.string().min(1, 'Department code is required'),
    }),
});
exports.designationSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1, 'Designation title is required'),
    }),
});
exports.leaveTypeSchema = zod_1.z.object({
    body: zod_1.z.object({
        key: zod_1.z.string().min(1, 'Key is required'),
        name: zod_1.z.string().min(1, 'Name is required'),
        yearlyQuota: zod_1.z.number().nullable(),
        isPaid: zod_1.z.boolean().default(true),
    }),
});
exports.holidaySchema = zod_1.z.object({
    body: zod_1.z.object({
        date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
        name: zod_1.z.string().min(1, 'Holiday name is required'),
    }),
});
