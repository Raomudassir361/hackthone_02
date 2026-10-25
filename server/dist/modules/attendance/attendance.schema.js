"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decideCorrectionSchema = exports.createCorrectionSchema = exports.boardQuerySchema = exports.calendarQuerySchema = exports.checkOutSchema = exports.checkInSchema = void 0;
const zod_1 = require("zod");
exports.checkInSchema = zod_1.z.object({
    body: zod_1.z.object({
        lat: zod_1.z.number().optional(),
        lng: zod_1.z.number().optional(),
    }),
});
exports.checkOutSchema = zod_1.z.object({
    body: zod_1.z.object({
        lat: zod_1.z.number().optional(),
        lng: zod_1.z.number().optional(),
    }),
});
exports.calendarQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        month: zod_1.z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
        employeeId: zod_1.z.string().optional(),
    }),
});
exports.boardQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
        departmentId: zod_1.z.string().optional(),
    }),
});
exports.createCorrectionSchema = zod_1.z.object({
    body: zod_1.z.object({
        date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
        requestedCheckIn: zod_1.z.string().datetime().optional(),
        requestedCheckOut: zod_1.z.string().datetime().optional(),
        reason: zod_1.z.string().min(5, 'Reason must be at least 5 characters long'),
    }),
});
exports.decideCorrectionSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1),
    }),
    body: zod_1.z.object({
        status: zod_1.z.enum(['approved', 'rejected']),
        decisionComment: zod_1.z.string().min(2, 'Decision comment is required'),
    }),
});
