import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service.js';

export class UsersController {
  public static async getUsers(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await UsersService.getUsers();
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async createHr(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await UsersService.createHrUser(req.ctx!, req.body, req.ip);
      res.status(201).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async toggleDeactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await UsersService.toggleDeactivate(req.ctx!, req.params.id, req.ip);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }

  public static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await UsersService.resetPassword(req.ctx!, req.params.id, req.ip);
      res.status(200).json({ data });
    } catch (e) {
      next(e);
    }
  }
}
