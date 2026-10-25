"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRouter = void 0;
const express_1 = require("express");
const dashboard_controller_js_1 = require("./dashboard.controller.js");
const auth_js_1 = require("../../middleware/auth.js");
exports.dashboardRouter = (0, express_1.Router)();
exports.dashboardRouter.use(auth_js_1.authenticate, auth_js_1.mustChangePasswordGuard);
// 1. HR Dashboard
exports.dashboardRouter.get('/hr', (0, auth_js_1.requireRole)(['admin', 'hr']), dashboard_controller_js_1.DashboardController.getHrDashboard);
// 2. Admin Dashboard
exports.dashboardRouter.get('/admin', (0, auth_js_1.requireRole)(['admin']), dashboard_controller_js_1.DashboardController.getAdminDashboard);
// 3. Employee Dashboard (Scoped to self)
exports.dashboardRouter.get('/employee', dashboard_controller_js_1.DashboardController.getEmployeeDashboard);
