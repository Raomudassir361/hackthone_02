import { z } from 'zod';

export const createEmployeeSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().optional(),
    address: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    departmentId: z.string().min(1, 'Department is required'),
    designationId: z.string().min(1, 'Designation is required'),
    joinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Join date must be YYYY-MM-DD'),
    status: z.enum(['probation', 'active', 'exited', 'inactive']).default('active'),
    basicSalary: z.number().min(0, 'Basic salary must be non-negative'),
  }),
});

export const updateEmployeeSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    departmentId: z.string().optional(),
    designationId: z.string().optional(),
    joinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    exitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    status: z.enum(['probation', 'active', 'exited', 'inactive']).optional(),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
});

export const updateSalarySchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    basicSalary: z.number().min(0, 'Basic salary must be non-negative'),
  }),
});

export const getEmployeesQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    departmentId: z.string().optional(),
    designationId: z.string().optional(),
    status: z.enum(['probation', 'active', 'exited', 'inactive']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const csvImportSchema = z.object({
  query: z.object({
    dryRun: z.enum(['true', 'false']).default('false'),
  }),
  body: z.object({
    csvContent: z.string().min(1, 'CSV content is required'),
  }),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>['body'];
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>['body'];
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type UpdateSalaryInput = z.infer<typeof updateSalarySchema>['body'];
export type GetEmployeesQuery = z.infer<typeof getEmployeesQuerySchema>['query'];
