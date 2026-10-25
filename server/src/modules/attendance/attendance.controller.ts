import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from './attendance.service.js';

export class AttendanceController {
  public static async checkIn(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AttendanceService.checkIn(req.ctx!, req.body, req.ip);
      res.status(201).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async checkOut(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AttendanceService.checkOut(req.ctx!, req.body, req.ip);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async getCalendar(req: Request, res: Response, next: NextFunction) {
    try {
      const month = req.query.month as string;
      const employeeId = req.query.employeeId as string | undefined;
      const data = await AttendanceService.getCalendar(req.ctx!, month, employeeId);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async getBoard(req: Request, res: Response, next: NextFunction) {
    try {
      const date = req.query.date as string;
      const departmentId = req.query.departmentId as string | undefined;
      const data = await AttendanceService.getBoard(req.ctx!, date, departmentId);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async requestCorrection(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AttendanceService.requestCorrection(req.ctx!, req.body, req.ip);
      res.status(201).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async getCorrections(req: Request, res: Response, next: NextFunction) {
    try {
      const status = (req.query.status as string) || 'pending';
      const data = await AttendanceService.getCorrections(req.ctx!, status);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async decideCorrection(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AttendanceService.decideCorrection(req.ctx!, req.params.id, req.body, req.ip);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }
}
