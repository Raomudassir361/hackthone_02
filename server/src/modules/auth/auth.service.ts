import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors.js';
import { UserModel } from './user.model.js';
import { SettingsModel } from '../org/org.model.js';
import { EmployeeModel } from '../employees/employee.model.js';
import { AuditService } from '../audit/audit.service.js';
import { LoginInput, ChangePasswordInput, SetupInput } from './auth.schema.js';
import { RequestContext } from '../../middleware/auth.js';

export class AuthService {
  public static async login(input: LoginInput, ip?: string) {
    const user = await UserModel.findOne({ email: input.email.toLowerCase() });
    if (!user || !user.isActive) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password');
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password');
    }

    user.lastLoginAt = new Date();
    await user.save();

    let employeeName: string | undefined;
    if (user.employeeId) {
      const emp = await EmployeeModel.findById(user.employeeId);
      if (emp) employeeName = emp.name;
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
        employeeId: user.employeeId?.toString(),
        email: user.email,
      },
      env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    await AuditService.log({
      actorId: user._id,
      actorRole: user.role,
      action: 'LOGIN',
      entity: 'users',
      entityId: user._id.toString(),
      ip,
    });

    return {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: employeeName,
        role: user.role,
        employeeId: user.employeeId?.toString(),
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  public static async changePassword(
    ctx: RequestContext,
    input: ChangePasswordInput,
    ip?: string
  ) {
    const user = await UserModel.findById(ctx.userId);
    if (!user) {
      throw new AppError('NOT_FOUND', 404, 'User not found');
    }

    const isMatch = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new AppError('INVALID_CREDENTIALS', 400, 'Current password is incorrect');
    }

    const newHash = await bcrypt.hash(input.newPassword, env.BCRYPT_ROUNDS);
    user.passwordHash = newHash;
    user.mustChangePassword = false;
    await user.save();

    await AuditService.log({
      actorId: user._id,
      actorRole: user.role,
      action: 'CHANGE_PASSWORD',
      entity: 'users',
      entityId: user._id.toString(),
      ip,
    });

    return { message: 'Password changed successfully' };
  }

  public static async getMe(ctx: RequestContext) {
    const user = await UserModel.findById(ctx.userId);
    if (!user) {
      throw new AppError('NOT_FOUND', 404, 'User not found');
    }

    let employee: { id: string; name: string; code: string } | undefined;
    if (user.employeeId) {
      const emp = await EmployeeModel.findById(user.employeeId);
      if (emp) {
        employee = {
          id: emp._id.toString(),
          name: emp.name,
          code: emp.code,
        };
      }
    }

    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      employeeId: user.employeeId?.toString(),
      employee,
    };
  }

  public static async getSetupStatus() {
    const settings = await SettingsModel.findOne();
    const adminCount = await UserModel.countDocuments({ role: 'admin' });
    const setupComplete = Boolean(settings?.setupComplete && adminCount > 0);
    return {
      setupComplete,
      companyName: settings?.companyName || null,
    };
  }

  public static async performSetup(input: SetupInput, ip?: string) {
    const status = await this.getSetupStatus();
    if (status.setupComplete) {
      throw new AppError('SETUP_COMPLETED', 409, 'Setup has already been completed.');
    }

    // Upsert or create Settings
    let settings = await SettingsModel.findOne();
    if (!settings) {
      settings = new SettingsModel({
        companyName: input.companyName,
        timezone: env.COMPANY_TIMEZONE || 'Asia/Karachi',
        setupComplete: true,
      });
    } else {
      settings.companyName = input.companyName;
      settings.setupComplete = true;
    }
    await settings.save();

    // Check if admin email already exists
    let admin = await UserModel.findOne({ email: input.adminEmail.toLowerCase() });
    if (admin) {
      throw new AppError('USER_EXISTS', 409, 'A user with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(input.adminPassword, env.BCRYPT_ROUNDS);
    admin = await UserModel.create({
      email: input.adminEmail.toLowerCase(),
      passwordHash,
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
    });

    await AuditService.log({
      actorId: admin._id,
      actorRole: 'admin',
      action: 'FIRST_RUN_SETUP',
      entity: 'settings',
      entityId: settings._id.toString(),
      after: { companyName: settings.companyName, adminEmail: admin.email },
      ip,
    });

    return {
      message: 'Setup completed successfully',
      companyName: settings.companyName,
      adminEmail: admin.email,
    };
  }

  public static async bootstrapFromEnv(): Promise<void> {
    if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
      return;
    }

    const status = await this.getSetupStatus();
    if (status.setupComplete) {
      return;
    }

    const companyName = env.COMPANY_NAME || 'Default Company';
    console.log(`🚀 Bootstrapping Admin from ENV: ${env.ADMIN_EMAIL}`);

    await this.performSetup({
      companyName,
      adminEmail: env.ADMIN_EMAIL,
      adminPassword: env.ADMIN_PASSWORD,
    });
  }
}
