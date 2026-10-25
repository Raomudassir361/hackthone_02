"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelLeaveSchema = exports.decideLeaveSchema = exports.previewLeaveSchema = exports.applyLeaveSchema = void 0;
const zod_1 = require("zod");
exports.applyLeaveSchema = zod_1.z.object({
    body: zod_1.z.object({
        leaveTypeKey: zod_1.z.string().min(1, 'Leave type is required'),
        startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
        endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
        reason: zod_1.z.string().min(3, 'Reason must be at least 3 characters long'),
        source: zod_1.z.enum(['form', 'ai']).default('form'),
    }),
});
exports.previewLeaveSchema = zod_1.z.object({
    query: zod_1.z.object({
        startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
});
exports.decideLeaveSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1),
    }),
    body: zod_1.z.object({
        status: zod_1.z.enum(['approved', 'rejected']),
        decisionComment: zod_1.z.string().min(2, 'Decision comment is required'),
    }),
});
exports.cancelLeaveSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1),
    }),
});
