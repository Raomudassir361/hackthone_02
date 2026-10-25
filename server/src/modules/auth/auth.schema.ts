import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long'),
  }),
});

export const setupSchema = z.object({
  body: z.object({
    companyName: z.string().min(1, 'Company name is required'),
    adminEmail: z.string().email(),
    adminPassword: z.string().min(8, 'Admin password must be at least 8 characters long'),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
export type SetupInput = z.infer<typeof setupSchema>['body'];
