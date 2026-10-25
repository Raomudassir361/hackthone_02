"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const mongoose_1 = __importDefault(require("mongoose"));
const env_js_1 = require("../../config/env.js");
const errors_js_1 = require("../../shared/errors.js");
const user_model_js_1 = require("../auth/user.model.js");
const employee_model_js_1 = require("../employees/employee.model.js");
const audit_service_js_1 = require("../audit/audit.service.js");
class UsersService {
    static async getUsers() {
        const users = await user_model_js_1.UserModel.find().select('-passwordHash').sort({ createdAt: -1 });
        return users;
    }
    static async createHrUser(ctx, input, ip) {
        const existing = await user_model_js_1.UserModel.findOne({ email: input.email.toLowerCase() });
        if (existing) {
            throw new errors_js_1.AppError('USER_EXISTS', 409, 'A user with this email already exists');
        }
        // 1. Generate temporary password
        const tempPassword = `HR-${crypto_1.default.randomBytes(4).toString('hex')}!`;
        const passwordHash = await bcrypt_1.default.hash(tempPassword, env_js_1.env.BCRYPT_ROUNDS);
        // 2. Generate employee code
        const seq = await (0, employee_model_js_1.getNextSequence)('employee_code');
        const code = `EMP-${String(seq).padStart(4, '0')}`;
        // 3. Create User record
        const user = await user_model_js_1.UserModel.create({
            email: input.email.toLowerCase(),
            passwordHash,
            role: 'hr',
            isActive: true,
            mustChangePassword: true, // forced password change
        });
        // 4. Create linked Employee record
        const employee = await employee_model_js_1.EmployeeModel.create({
            code,
            name: input.name,
            email: input.email.toLowerCase(),
            phone: input.phone,
            departmentId: input.departmentId ? new mongoose_1.default.Types.ObjectId(input.departmentId) : undefined,
            designationId: input.designationId ? new mongoose_1.default.Types.ObjectId(input.designationId) : undefined,
            joinDate: input.joinDate,
            status: 'active',
            basicSalary: input.basicSalary,
            userId: user._id,
        });
        user.employeeId = employee._id;
        await user.save();
        await audit_service_js_1.AuditService.log({
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
    static async toggleDeactivate(ctx, id, ip) {
        const user = await user_model_js_1.UserModel.findById(id);
        if (!user)
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'User not found');
        if (user.role === 'admin' && user._id.toString() === ctx.userId) {
            throw new errors_js_1.AppError('FORBIDDEN', 403, 'Admin cannot deactivate own account');
        }
        const previousState = user.isActive;
        user.isActive = !user.isActive;
        await user.save();
        await audit_service_js_1.AuditService.log({
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
    static async resetPassword(ctx, id, ip) {
        const user = await user_model_js_1.UserModel.findById(id);
        if (!user)
            throw new errors_js_1.AppError('NOT_FOUND', 404, 'User not found');
        const tempPassword = `Reset-${crypto_1.default.randomBytes(4).toString('hex')}!`;
        const passwordHash = await bcrypt_1.default.hash(tempPassword, env_js_1.env.BCRYPT_ROUNDS);
        user.passwordHash = passwordHash;
        user.mustChangePassword = true;
        await user.save();
        await audit_service_js_1.AuditService.log({
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
exports.UsersService = UsersService;
