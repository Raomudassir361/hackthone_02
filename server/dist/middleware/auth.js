"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireRole = requireRole;
exports.mustChangePasswordGuard = mustChangePasswordGuard;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_js_1 = require("../config/env.js");
const errors_js_1 = require("../shared/errors.js");
const user_model_js_1 = require("../modules/auth/user.model.js");
async function authenticate(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errors_js_1.AppError('UNAUTHORIZED', 401, 'Authentication token missing or invalid');
        }
        const token = authHeader.split(' ')[1];
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, env_js_1.env.JWT_SECRET);
        }
        catch {
            throw new errors_js_1.AppError('UNAUTHORIZED', 401, 'Invalid or expired authentication token');
        }
        const user = await user_model_js_1.UserModel.findById(decoded.userId);
        if (!user || !user.isActive) {
            throw new errors_js_1.AppError('UNAUTHORIZED', 401, 'User account is inactive or not found');
        }
        req.ctx = {
            userId: user._id.toString(),
            role: user.role,
            employeeId: user.employeeId?.toString(),
            email: user.email,
            mustChangePassword: user.mustChangePassword,
        };
        next();
    }
    catch (error) {
        next(error);
    }
}
function requireRole(allowedRoles) {
    return (req, _res, next) => {
        if (!req.ctx) {
            return next(new errors_js_1.AppError('UNAUTHORIZED', 401, 'Authentication required'));
        }
        if (!allowedRoles.includes(req.ctx.role)) {
            return next(new errors_js_1.AppError('FORBIDDEN', 403, 'You do not have permission to perform this action'));
        }
        next();
    };
}
function mustChangePasswordGuard(req, _res, next) {
    if (!req.ctx) {
        return next();
    }
    // Allow only password change and me requests if user must change password
    const allowedPaths = ['/api/auth/change-password', '/api/auth/me'];
    if (req.ctx.mustChangePassword && !allowedPaths.includes(req.originalUrl.split('?')[0])) {
        return next(new errors_js_1.AppError('PASSWORD_CHANGE_REQUIRED', 403, 'You must change your temporary password before accessing the system'));
    }
    next();
}
