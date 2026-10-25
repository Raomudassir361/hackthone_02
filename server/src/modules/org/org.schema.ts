import { z } from 'zod';

export const updateSettingsSchema = z.object({
  body: z.object({
    companyName: z.string().min(1).optional(),
    timezone: z.string().optional(),
    officeStart: z.string().regex(/^\d{2}:\d{2}$/, 'Must be in HH:MM format').optional(),
    graceMinutes: z.number().int().min(0).max(120).optional(),
    halfDayHours: z.number().min(1).max(12).optional(),
    weekendDays: z.array(z.number().int().min(0).max(6)).optional(),
    officeLat: z.number().optional(),
    officeLng: z.number().optional(),
    officeRadiusM: z.number().min(10).optional(),
    hraPct: z.number().min(0).max(100).optional(),
    medicalPct: z.number().min(0).max(100).optional(),
  }),
});

export const departmentSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Department name is required'),
    code: z.string().min(1, 'Department code is required'),
  }),
});

export const designationSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Designation title is required'),
  }),
});

export const leaveTypeSchema = z.object({
  body: z.object({
    key: z.string().min(1, 'Key is required'),
    name: z.string().min(1, 'Name is required'),
    yearlyQuota: z.number().nullable(),
    isPaid: z.boolean().default(true),
  }),
});

export const holidaySchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    name: z.string().min(1, 'Holiday name is required'),
  }),
});
