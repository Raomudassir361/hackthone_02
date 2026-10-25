import { Router } from 'express';
import { DashboardController } from './dashboard.controller.js';
import { authenticate, requireRole, mustChangePasswordGuard } from '../../middleware/auth.js';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate, mustChangePasswordGuard);

// 1. HR Dashboard
dashboardRouter.get('/hr', requireRole(['admin', 'hr']), DashboardController.getHrDashboard);

// 2. Admin Dashboard
dashboardRouter.get('/admin', requireRole(['admin']), DashboardController.getAdminDashboard);

// 3. Employee Dashboard (Scoped to self)
dashboardRouter.get('/employee', DashboardController.getEmployeeDashboard);
