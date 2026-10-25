import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';

export class AuthController {
  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body, req.ip);
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.changePassword(req.ctx!, req.body, req.ip);
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.getMe(req.ctx!);
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async getSetupStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.getSetupStatus();
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async performSetup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.performSetup(req.body, req.ip);
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  }
}
