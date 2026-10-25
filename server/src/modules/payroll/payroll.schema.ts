import { z } from 'zod';

export const CreatePayrollRunSchema = z.object({
  body: z.object({
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'),
  }),
});

export type CreatePayrollRunInput = z.infer<typeof CreatePayrollRunSchema>['body'];
