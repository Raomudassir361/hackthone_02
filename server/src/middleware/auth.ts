import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../shared/errors.js';
import { UserModel, UserRole } from '../modules/auth/user.model.js';

export interface RequestContext {
  userId: string;
  role: UserRole;
  employeeId?: string;
  email: string;
  mustChangePassword: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      ctx?: RequestContext;
    }
  }
}

export interface JwtPayload {
  userId: string;
  role: UserRole;
  employeeId?: string;
  email: string;
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('UNAUTHORIZED', 401, 'Authentication token missing or invalid');
    }

    const token = authHeader.split(' ')[1];
    let decoded: JwtPayload;

    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      throw new AppError('UNAUTHORIZED', 401, 'Invalid or expired authentication token');
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw new AppError('UNAUTHORIZED', 401, 'User account is inactive or not found');
    }

    req.ctx = {
      userId: user._id.toString(),
      role: user.role,
      employeeId: user.employeeId?.toString(),
      email: user.email,
      mustChangePassword: user.mustChangePassword,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.ctx) {
      return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    }

    if (!allowedRoles.includes(req.ctx.role)) {
      return next(
        new AppError('FORBIDDEN', 403, 'You do not have permission to perform this action')
      );
    }

    next();
  };
}

export function mustChangePasswordGuard(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.ctx) {
    return next();
  }

  // Allow only password change and me requests if user must change password
  const allowedPaths = ['/api/auth/change-password', '/api/auth/me'];
  if (req.ctx.mustChangePassword && !allowedPaths.includes(req.originalUrl.split('?')[0])) {
    return next(
      new AppError(
        'PASSWORD_CHANGE_REQUIRED',
        403,
        'You must change your temporary password before accessing the system'
      )
    );
  }

  next();
}
