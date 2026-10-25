import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service.js';

export class DashboardController {
  public static async getHrDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AnalyticsService.getHrDashboard({
        from: req.query.from as string,
        to: req.query.to as string,
        departmentId: req.query.departmentId as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  public static async getAdminDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AnalyticsService.getAdminDashboard({
        from: req.query.from as string,
        to: req.query.to as string,
        departmentId: req.query.departmentId as string,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  public static async getEmployeeDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AnalyticsService.getEmployeeDashboard(req.ctx!);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
