import { z } from 'zod';

export const checkInSchema = z.object({
  body: z.object({
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
});

export const checkOutSchema = z.object({
  body: z.object({
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
});

export const calendarQuerySchema = z.object({
  query: z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
    employeeId: z.string().optional(),
  }),
});

export const boardQuerySchema = z.object({
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    departmentId: z.string().optional(),
  }),
});

export const createCorrectionSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    requestedCheckIn: z.string().datetime().optional(),
    requestedCheckOut: z.string().datetime().optional(),
    reason: z.string().min(5, 'Reason must be at least 5 characters long'),
  }),
});

export const decideCorrectionSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    status: z.enum(['approved', 'rejected']),
    decisionComment: z.string().min(2, 'Decision comment is required'),
  }),
});

export type CheckInInput = z.infer<typeof checkInSchema>['body'];
export type CheckOutInput = z.infer<typeof checkOutSchema>['body'];
export type CreateCorrectionInput = z.infer<typeof createCorrectionSchema>['body'];
export type DecideCorrectionInput = z.infer<typeof decideCorrectionSchema>['body'];
