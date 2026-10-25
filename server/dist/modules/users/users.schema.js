"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.createHrSchema = void 0;
const zod_1 = require("zod");
exports.createHrSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required'),
        email: zod_1.z.string().email('Valid email is required'),
        phone: zod_1.z.string().optional(),
        departmentId: zod_1.z.string().optional(),
        designationId: zod_1.z.string().optional(),
        joinDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Join date must be YYYY-MM-DD'),
        basicSalary: zod_1.z.number().min(0, 'Basic salary must be greater than or equal to 0'),
    }),
});
exports.resetPasswordSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1),
    }),
});
