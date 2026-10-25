"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRouter = exports.authRouter = void 0;
const express_1 = require("express");
const auth_controller_js_1 = require("./auth.controller.js");
const validate_js_1 = require("../../middleware/validate.js");
const auth_js_1 = require("../../middleware/auth.js");
const auth_schema_js_1 = require("./auth.schema.js");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.authRouter = (0, express_1.Router)();
exports.setupRouter = (0, express_1.Router)();
const loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 20,
    skip: () => process.env.NODE_ENV === 'test',
    message: {
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many login attempts, please try again in 15 minutes',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Auth Routes
exports.authRouter.post('/login', loginLimiter, (0, validate_js_1.validate)(auth_schema_js_1.loginSchema), auth_controller_js_1.AuthController.login);
exports.authRouter.get('/me', auth_js_1.authenticate, auth_controller_js_1.AuthController.getMe);
exports.authRouter.post('/change-password', auth_js_1.authenticate, (0, validate_js_1.validate)(auth_schema_js_1.changePasswordSchema), auth_controller_js_1.AuthController.changePassword);
// Setup Routes
exports.setupRouter.get('/status', auth_controller_js_1.AuthController.getSetupStatus);
exports.setupRouter.post('/', (0, validate_js_1.validate)(auth_schema_js_1.setupSchema), auth_controller_js_1.AuthController.performSetup);
