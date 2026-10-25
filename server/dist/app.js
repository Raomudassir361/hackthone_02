"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_js_1 = require("./config/env.js");
const error_js_1 = require("./middleware/error.js");
const auth_routes_js_1 = require("./modules/auth/auth.routes.js");
const org_routes_js_1 = require("./modules/org/org.routes.js");
const users_routes_js_1 = require("./modules/users/users.routes.js");
const employee_routes_js_1 = require("./modules/employees/employee.routes.js");
const attendance_routes_js_1 = require("./modules/attendance/attendance.routes.js");
const leave_routes_js_1 = require("./modules/leave/leave.routes.js");
const payroll_routes_js_1 = require("./modules/payroll/payroll.routes.js");
const dashboard_routes_js_1 = require("./modules/analytics/dashboard.routes.js");
const comms_routes_js_1 = require("./modules/comms/comms.routes.js");
const ai_routes_js_1 = require("./modules/ai/ai.routes.js");
function createApp() {
    const app = (0, express_1.default)();
    // Security & headers
    app.use((0, helmet_1.default)());
    // CORS
    const allowedOrigins = env_js_1.env.CLIENT_URL.split(',').map((origin) => origin.trim());
    app.use((0, cors_1.default)({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    }));
    // Body parser with size limits
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
    // Global basic rate limiter
    const limiter = (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000,
        max: 1000,
        standardHeaders: true,
        legacyHeaders: false,
    });
    app.use(limiter);
    // Health route
    app.get('/api/health', (_req, res) => {
        res.status(200).json({
            data: {
                status: 'ok',
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
            },
        });
    });
    // Feature Routes
    app.use('/api/setup', auth_routes_js_1.setupRouter);
    app.use('/api/auth', auth_routes_js_1.authRouter);
    app.use('/api', org_routes_js_1.orgRouter);
    app.use('/api/users', users_routes_js_1.usersRouter);
    app.use('/api/employees', employee_routes_js_1.employeeRouter);
    app.use('/api/me', employee_routes_js_1.meRouter);
    app.use('/api/attendance', attendance_routes_js_1.attendanceRouter);
    app.use('/api/leave', leave_routes_js_1.leaveRouter);
    app.use('/api/payroll', payroll_routes_js_1.payrollRouter);
    app.use('/api/payslips', payroll_routes_js_1.payslipRouter);
    app.use('/api/dashboard', dashboard_routes_js_1.dashboardRouter);
    app.use('/api', comms_routes_js_1.commsRouter);
    app.use('/api/ai', ai_routes_js_1.aiRouter);
    // Global error handler
    app.use(error_js_1.errorHandler);
    return app;
}
