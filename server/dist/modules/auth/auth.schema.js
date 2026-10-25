"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSchema = exports.changePasswordSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(1, 'Password is required'),
    }),
});
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        currentPassword: zod_1.z.string().min(1, 'Current password is required'),
        newPassword: zod_1.z
            .string()
            .min(8, 'New password must be at least 8 characters long'),
    }),
});
exports.setupSchema = zod_1.z.object({
    body: zod_1.z.object({
        companyName: zod_1.z.string().min(1, 'Company name is required'),
        adminEmail: zod_1.z.string().email(),
        adminPassword: zod_1.z.string().min(8, 'Admin password must be at least 8 characters long'),
    }),
});
