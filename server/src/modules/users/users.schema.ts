import { z } from 'zod';

export const createHrSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().optional(),
    departmentId: z.string().optional(),
    designationId: z.string().optional(),
    joinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Join date must be YYYY-MM-DD'),
    basicSalary: z.number().min(0, 'Basic salary must be greater than or equal to 0'),
  }),
});

export const resetPasswordSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});
