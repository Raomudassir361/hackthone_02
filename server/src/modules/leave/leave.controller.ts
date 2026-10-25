import { Request, Response, NextFunction } from 'express';
import { LeaveService } from './leave.service.js';

export class LeaveController {
  public static async calculateWorkingDays(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query as { startDate: string; endDate: string };
      const days = await LeaveService.calculateLeaveWorkingDays(startDate, endDate);
      res.status(200).json({ data: { workingDays: days } });
    } catch (e) {
      next(e);
    }
  }

  public static async getBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.query.employeeId as string | undefined;
      const data = await LeaveService.getLeaveBalance(req.ctx!, employeeId);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async applyLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await LeaveService.applyLeave(req.ctx!, req.body, req.ip);
      res.status(201).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async getLeaveRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const employeeId = req.query.employeeId as string | undefined;
      const data = await LeaveService.getLeaveRequests(req.ctx!, { status, employeeId });
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async getLeaveInbox(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await LeaveService.getLeaveInbox(req.ctx!);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async decideLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await LeaveService.decideLeave(req.ctx!, req.params.id, req.body, req.ip);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async cancelLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await LeaveService.cancelLeave(req.ctx!, req.params.id, req.ip);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }
}
