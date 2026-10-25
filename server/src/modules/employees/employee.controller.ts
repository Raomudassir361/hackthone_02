import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from './employee.service.js';

export class EmployeeController {
  public static async createEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await EmployeeService.createEmployee(req.ctx!, req.body, req.ip);
      res.status(201).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async updateEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await EmployeeService.updateEmployee(req.ctx!, req.params.id, req.body, req.ip);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async getEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await EmployeeService.getEmployees(req.ctx!, req.query as any);
      res.status(200).json(data);
    } catch (e) {
      next(e);
    }
  }

  public static async getEmployeeById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await EmployeeService.getEmployeeById(req.ctx!, req.params.id);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async updateOwnProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await EmployeeService.updateOwnProfile(req.ctx!, req.body, req.ip);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async getSalary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await EmployeeService.getSalary(req.ctx!, req.params.id);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async updateSalary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await EmployeeService.updateSalary(req.ctx!, req.params.id, req.body, req.ip);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async importCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const dryRun = req.query.dryRun === 'true';
      const data = await EmployeeService.importCsv(req.ctx!, req.body.csvContent, dryRun, req.ip);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async exportCsv(_req: Request, res: Response, next: NextFunction) {
    try {
      const csv = await EmployeeService.exportCsv();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="employees.csv"');
      res.status(200).send(csv);
    } catch (e) {
      next(e);
    }
  }
}
