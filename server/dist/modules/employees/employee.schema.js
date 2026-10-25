"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.csvImportSchema = exports.getEmployeesQuerySchema = exports.updateSalarySchema = exports.updateProfileSchema = exports.updateEmployeeSchema = exports.createEmployeeSchema = void 0;
const zod_1 = require("zod");
exports.createEmployeeSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required'),
        email: zod_1.z.string().email('Valid email is required'),
        phone: zod_1.z.string().optional(),
        address: zod_1.z.string().optional(),
        gender: zod_1.z.enum(['male', 'female', 'other']).optional(),
        departmentId: zod_1.z.string().min(1, 'Department is required'),
        designationId: zod_1.z.string().min(1, 'Designation is required'),
        joinDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Join date must be YYYY-MM-DD'),
        status: zod_1.z.enum(['probation', 'active', 'exited', 'inactive']).default('active'),
        basicSalary: zod_1.z.number().min(0, 'Basic salary must be non-negative'),
    }),
});
exports.updateEmployeeSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).optional(),
        email: zod_1.z.string().email().optional(),
        phone: zod_1.z.string().optional(),
        address: zod_1.z.string().optional(),
        gender: zod_1.z.enum(['male', 'female', 'other']).optional(),
        departmentId: zod_1.z.string().optional(),
        designationId: zod_1.z.string().optional(),
        joinDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        exitDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        status: zod_1.z.enum(['probation', 'active', 'exited', 'inactive']).optional(),
    }),
});
exports.updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        phone: zod_1.z.string().optional(),
        address: zod_1.z.string().optional(),
    }),
});
exports.updateSalarySchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1),
    }),
    body: zod_1.z.object({
        basicSalary: zod_1.z.number().min(0, 'Basic salary must be non-negative'),
    }),
});
exports.getEmployeesQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        search: zod_1.z.string().optional(),
        departmentId: zod_1.z.string().optional(),
        designationId: zod_1.z.string().optional(),
        status: zod_1.z.enum(['probation', 'active', 'exited', 'inactive']).optional(),
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    }),
});
exports.csvImportSchema = zod_1.z.object({
    query: zod_1.z.object({
        dryRun: zod_1.z.enum(['true', 'false']).default('false'),
    }),
    body: zod_1.z.object({
        csvContent: zod_1.z.string().min(1, 'CSV content is required'),
    }),
});
