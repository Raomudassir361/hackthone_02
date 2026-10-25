import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.js';
import { authRouter, setupRouter } from './modules/auth/auth.routes.js';
import { orgRouter } from './modules/org/org.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { employeeRouter, meRouter } from './modules/employees/employee.routes.js';
import { attendanceRouter } from './modules/attendance/attendance.routes.js';
import { leaveRouter } from './modules/leave/leave.routes.js';
import { payrollRouter, payslipRouter } from './modules/payroll/payroll.routes.js';
import { dashboardRouter } from './modules/analytics/dashboard.routes.js';
import { commsRouter } from './modules/comms/comms.routes.js';
import { aiRouter } from './modules/ai/ai.routes.js';

export function createApp(): Express {
  const app = express();

  // Security & headers
  app.use(helmet());

  // CORS
  const allowedOrigins = env.CLIENT_URL.split(',').map((origin) => origin.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );

  // Body parser with size limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Global basic rate limiter
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Health route
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      data: {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Feature Routes
  app.use('/api/setup', setupRouter);
  app.use('/api/auth', authRouter);
  app.use('/api', orgRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/employees', employeeRouter);
  app.use('/api/me', meRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/leave', leaveRouter);
  app.use('/api/payroll', payrollRouter);
  app.use('/api/payslips', payslipRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api', commsRouter);
  app.use('/api/ai', aiRouter);

  // Global error handler
  app.use(errorHandler);

  return app;
}
