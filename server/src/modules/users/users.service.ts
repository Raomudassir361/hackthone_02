import crypto from 'crypto';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors.js';
import { UserModel } from '../auth/user.model.js';
import { EmployeeModel, getNextSequence } from '../employees/employee.model.js';
import { AuditService } from '../audit/audit.service.js';
import { RequestContext } from '../../middleware/auth.js';

export interface CreateHrInput {
  name: string;
  email: string;
  phone?: string;
  departmentId?: string;
  designationId?: string;
  joinDate: string;
  basicSalary: number;
}

export class UsersService {
  public static async getUsers() {
    const users = await UserModel.find().select('-passwordHash').sort({ createdAt: -1 });
    return users;
  }

  public static async createHrUser(ctx: RequestContext, input: CreateHrInput, ip?: string) {
    const existing = await UserModel.findOne({ email: input.email.toLowerCase() });
    if (existing) {
      throw new AppError('USER_EXISTS', 409, 'A user with this email already exists');
    }

    // 1. Generate temporary password
    const tempPassword = `HR-${crypto.randomBytes(4).toString('hex')}!`;
    const passwordHash = await bcrypt.hash(tempPassword, env.BCRYPT_ROUNDS);

    // 2. Generate employee code
    const seq = await getNextSequence('employee_code');
    const code = `EMP-${String(seq).padStart(4, '0')}`;

    // 3. Create User record
    const user = await UserModel.create({
      email: input.email.toLowerCase(),
      passwordHash,
      role: 'hr',
      isActive: true,
      mustChangePassword: true, // forced password change
    });

    // 4. Create linked Employee record
    const employee = await EmployeeModel.create({
      code,
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      departmentId: input.departmentId ? new mongoose.Types.ObjectId(input.departmentId) : undefined,
      designationId: input.designationId ? new mongoose.Types.ObjectId(input.designationId) : undefined,
      joinDate: input.joinDate,
      status: 'active',
      basicSalary: input.basicSalary,
      userId: user._id,
    });

    user.employeeId = employee._id;
    await user.save();

    await AuditService.log({
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: 'CREATE_HR_USER',
      entity: 'users',
      entityId: user._id.toString(),
      after: { email: user.email, role: 'hr', employeeCode: code },
      ip,
    });

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
      employee: {
        id: employee._id.toString(),
        code: employee.code,
        name: employee.name,
      },
      temporaryPassword: tempPassword, // Returned ONCE for HR creation handover
    };
  }

  public static async toggleDeactivate(ctx: RequestContext, id: string, ip?: string) {
    const user = await UserModel.findById(id);
    if (!user) throw new AppError('NOT_FOUND', 404, 'User not found');
    if (user.role === 'admin' && user._id.toString() === ctx.userId) {
      throw new AppError('FORBIDDEN', 403, 'Admin cannot deactivate own account');
    }

    const previousState = user.isActive;
    user.isActive = !user.isActive;
    await user.save();

    await AuditService.log({
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: user.isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      entity: 'users',
      entityId: id,
      before: { isActive: previousState },
      after: { isActive: user.isActive },
      ip,
    });

    return {
      id: user._id.toString(),
      email: user.email,
      isActive: user.isActive,
    };
  }

  public static async resetPassword(ctx: RequestContext, id: string, ip?: string) {
    const user = await UserModel.findById(id);
    if (!user) throw new AppError('NOT_FOUND', 404, 'User not found');

    const tempPassword = `Reset-${crypto.randomBytes(4).toString('hex')}!`;
    const passwordHash = await bcrypt.hash(tempPassword, env.BCRYPT_ROUNDS);

    user.passwordHash = passwordHash;
    user.mustChangePassword = true;
    await user.save();

    await AuditService.log({
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: 'RESET_PASSWORD',
      entity: 'users',
      entityId: id,
      ip,
    });

    return {
      message: 'Password reset successfully',
      temporaryPassword: tempPassword,
    };
  }
}
