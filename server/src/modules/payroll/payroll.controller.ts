import { Request, Response, NextFunction } from 'express';
import { PayrollService } from './payroll.service.js';

export class PayrollController {
  public static async createDraftRun(req: Request, res: Response, next: NextFunction) {
    try {
      const run = await PayrollService.createDraftRun(req.body.month, req.ctx!);
      res.status(201).json({ success: true, data: run });
    } catch (err) {
      next(err);
    }
  }

  public static async getRuns(_req: Request, res: Response, next: NextFunction) {
    try {
      const runs = await PayrollService.getRuns();
      res.json({ success: true, data: runs });
    } catch (err) {
      next(err);
    }
  }

  public static async getRunById(req: Request, res: Response, next: NextFunction) {
    try {
      const run = await PayrollService.getRunById(req.params.id);
      res.json({ success: true, data: run });
    } catch (err) {
      next(err);
    }
  }

  public static async regenerateDraftRun(req: Request, res: Response, next: NextFunction) {
    try {
      const run = await PayrollService.regenerateDraftRun(req.params.id, req.ctx!);
      res.json({ success: true, data: run });
    } catch (err) {
      next(err);
    }
  }

  public static async finalizeRun(req: Request, res: Response, next: NextFunction) {
    try {
      const run = await PayrollService.finalizeRun(req.params.id, req.ctx!);
      res.json({ success: true, data: run });
    } catch (err) {
      next(err);
    }
  }

  public static async getPayslips(req: Request, res: Response, next: NextFunction) {
    try {
      const payslips = await PayrollService.getPayslips(req.ctx!);
      res.json({ success: true, data: payslips });
    } catch (err) {
      next(err);
    }
  }

  public static async getPayslipPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const { doc, filename } = await PayrollService.getPayslipPdf(req.params.id, req.ctx!);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      doc.pipe(res);
      doc.end();
    } catch (err) {
      next(err);
    }
  }
}
