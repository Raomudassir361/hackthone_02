import { Router } from 'express';
import { AiController } from './ai.controller.js';
import { authenticate, requireRole, mustChangePasswordGuard } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { z } from 'zod';

const ChatSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Message is required'),
  }),
});

const SmartLeaveSchema = z.object({
  body: z.object({
    text: z.string().min(3, 'Query text must be at least 3 characters'),
  }),
});

export const aiRouter = Router();

aiRouter.use(authenticate, mustChangePasswordGuard);

// 1. POST /api/ai/chat (All roles)
aiRouter.post('/chat', validate(ChatSchema), AiController.chat);

// 2. POST /api/ai/summary (Admin/HR only)
aiRouter.post('/summary', requireRole(['admin', 'hr']), AiController.summary);

// 3. POST /api/ai/smart-leave (All roles with employee profile)
aiRouter.post('/smart-leave', validate(SmartLeaveSchema), AiController.smartLeave);
