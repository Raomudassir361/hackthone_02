import { z } from 'zod';

export const applyLeaveSchema = z.object({
  body: z.object({
    leaveTypeKey: z.string().min(1, 'Leave type is required'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
    reason: z.string().min(3, 'Reason must be at least 3 characters long'),
    source: z.enum(['form', 'ai']).default('form'),
  }),
});

export const previewLeaveSchema = z.object({
  query: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
});

export const decideLeaveSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    status: z.enum(['approved', 'rejected']),
    decisionComment: z.string().min(2, 'Decision comment is required'),
  }),
});

export const cancelLeaveSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>['body'];
export type DecideLeaveInput = z.infer<typeof decideLeaveSchema>['body'];
