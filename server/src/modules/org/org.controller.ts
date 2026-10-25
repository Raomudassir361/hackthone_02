import { Request, Response, NextFunction } from 'express';
import { OrgService } from './org.service.js';

export class OrgController {
  // Settings
  public static async getSettings(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await OrgService.getSettings();
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await OrgService.updateSettings(req.ctx!, req.body, req.ip);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  // Departments
  public static async getDepartments(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await OrgService.getDepartments();
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async createDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await OrgService.createDepartment(req.ctx!, req.body, req.ip);
      res.status(201).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async updateDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await OrgService.updateDepartment(req.ctx!, req.params.id, req.body, req.ip);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async deleteDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await OrgService.deleteDepartment(req.ctx!, req.params.id, req.ip);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  // Designations
  public static async getDesignations(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await OrgService.getDesignations();
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async createDesignation(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await OrgService.createDesignation(req.ctx!, req.body, req.ip);
      res.status(201).json({ data });
    } catch (e) {
      next(e);
    }
  }

  // Leave Types
  public static async getLeaveTypes(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await OrgService.getLeaveTypes();
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async createLeaveType(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await OrgService.createLeaveType(req.ctx!, req.body, req.ip);
      res.status(201).json({ data });
    } catch (e) {
      next(e);
    }
  }

  // Holidays
  public static async getHolidays(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await OrgService.getHolidays();
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async createHoliday(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await OrgService.createHoliday(req.ctx!, req.body, req.ip);
      res.status(201).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async deleteHoliday(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await OrgService.deleteHoliday(req.ctx!, req.params.id, req.ip);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }
}
