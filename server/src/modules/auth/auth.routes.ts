import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { loginSchema, changePasswordSchema, setupSchema } from './auth.schema.js';
import rateLimit from 'express-rate-limit';

export const authRouter = Router();
export const setupRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts, please try again in 15 minutes',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth Routes
authRouter.post('/login', loginLimiter, validate(loginSchema), AuthController.login);
authRouter.get('/me', authenticate, AuthController.getMe);
authRouter.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  AuthController.changePassword
);

// Setup Routes
setupRouter.get('/status', AuthController.getSetupStatus);
setupRouter.post('/', validate(setupSchema), AuthController.performSetup);
