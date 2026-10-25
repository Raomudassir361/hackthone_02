"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_js_1 = require("../../config/env.js");
const errors_js_1 = require("../../shared/errors.js");
const user_model_js_1 = require("./user.model.js");
const org_model_js_1 = require("../org/org.model.js");
const employee_model_js_1 = require("../employees/employee.model.js");
const audit_service_js_1 = require("../audit/audit.service.js");
class AuthService {
    static async login(input, ip) {
        const user = await user_model_js_1.UserModel.findOne({ email: input.email.toLowerCase() });
        if (!user || !user.isActive) {
            throw new errors_js_1.AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password');
        }
        const isMatch = await bcrypt_1.default.compare(input.password, user.passwordHash);
        if (!isMatch) {
            throw new errors_js_1.AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password');
        }
        user.lastLoginAt = new Date();
        await user.save();
        let employeeName;
        if (user.employeeId) {
            const emp = await employee_model_js_1.EmployeeModel.findById(user.employeeId);
            if (emp)
                employeeName = emp.name;
        }
        const token = jsonwebtoken_1.default.sign({
            userId: user._id.toString(),
            role: user.role,
            employeeId: user.employeeId?.toString(),
            email: user.email,
        }, env_js_1.env.JWT_SECRET, { expiresIn: '8h' });
        await audit_service_js_1.AuditService.log({
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
    static async changePassword(ctx, input, ip) {
        const user = await user_model_js_1.UserModel.findById(ctx.userId);
        if (!user) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'User not found');
        }
        const isMatch = await bcrypt_1.default.compare(input.currentPassword, user.passwordHash);
        if (!isMatch) {
            throw new errors_js_1.AppError('INVALID_CREDENTIALS', 400, 'Current password is incorrect');
        }
        const newHash = await bcrypt_1.default.hash(input.newPassword, env_js_1.env.BCRYPT_ROUNDS);
        user.passwordHash = newHash;
        user.mustChangePassword = false;
        await user.save();
        await audit_service_js_1.AuditService.log({
            actorId: user._id,
            actorRole: user.role,
            action: 'CHANGE_PASSWORD',
            entity: 'users',
            entityId: user._id.toString(),
            ip,
        });
        return { message: 'Password changed successfully' };
    }
    static async getMe(ctx) {
        const user = await user_model_js_1.UserModel.findById(ctx.userId);
        if (!user) {
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'User not found');
        }
        let employee;
        if (user.employeeId) {
            const emp = await employee_model_js_1.EmployeeModel.findById(user.employeeId);
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
    static async getSetupStatus() {
        const settings = await org_model_js_1.SettingsModel.findOne();
        const adminCount = await user_model_js_1.UserModel.countDocuments({ role: 'admin' });
        const setupComplete = Boolean(settings?.setupComplete && adminCount > 0);
        return {
            setupComplete,
            companyName: settings?.companyName || null,
        };
    }
    static async performSetup(input, ip) {
        const status = await this.getSetupStatus();
        if (status.setupComplete) {
            throw new errors_js_1.AppError('SETUP_COMPLETED', 409, 'Setup has already been completed.');
        }
        // Upsert or create Settings
        let settings = await org_model_js_1.SettingsModel.findOne();
        if (!settings) {
            settings = new org_model_js_1.SettingsModel({
                companyName: input.companyName,
                timezone: env_js_1.env.COMPANY_TIMEZONE || 'Asia/Karachi',
                setupComplete: true,
            });
        }
        else {
            settings.companyName = input.companyName;
            settings.setupComplete = true;
        }
        await settings.save();
        // Check if admin email already exists
        let admin = await user_model_js_1.UserModel.findOne({ email: input.adminEmail.toLowerCase() });
        if (admin) {
            throw new errors_js_1.AppError('USER_EXISTS', 409, 'A user with this email already exists.');
        }
        const passwordHash = await bcrypt_1.default.hash(input.adminPassword, env_js_1.env.BCRYPT_ROUNDS);
        admin = await user_model_js_1.UserModel.create({
            email: input.adminEmail.toLowerCase(),
            passwordHash,
            role: 'admin',
            isActive: true,
            mustChangePassword: false,
        });
        await audit_service_js_1.AuditService.log({
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
    static async bootstrapFromEnv() {
        if (!env_js_1.env.ADMIN_EMAIL || !env_js_1.env.ADMIN_PASSWORD) {
            return;
        }
        const status = await this.getSetupStatus();
        if (status.setupComplete) {
            return;
        }
        const companyName = env_js_1.env.COMPANY_NAME || 'Default Company';
        console.log(`🚀 Bootstrapping Admin from ENV: ${env_js_1.env.ADMIN_EMAIL}`);
        await this.performSetup({
            companyName,
            adminEmail: env_js_1.env.ADMIN_EMAIL,
            adminPassword: env_js_1.env.ADMIN_PASSWORD,
        });
    }
}
exports.AuthService = AuthService;
