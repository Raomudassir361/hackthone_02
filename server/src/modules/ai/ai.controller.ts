import { Request, Response, NextFunction } from 'express';
import { AiService } from './ai.service.js';

export class AiController {
  public static async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AiService.chat(req.body.message, req.ctx!);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AiService.summarize(req.body, req.ctx!);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async smartLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AiService.smartLeave(req.body.text, req.ctx!);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
