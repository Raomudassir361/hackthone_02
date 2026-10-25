"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_js_1 = require("./auth.service.js");
class AuthController {
    static async login(req, res, next) {
        try {
            const result = await auth_service_js_1.AuthService.login(req.body, req.ip);
            res.status(200).json({ data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async changePassword(req, res, next) {
        try {
            const result = await auth_service_js_1.AuthService.changePassword(req.ctx, req.body, req.ip);
            res.status(200).json({ data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getMe(req, res, next) {
        try {
            const result = await auth_service_js_1.AuthService.getMe(req.ctx);
            res.status(200).json({ data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getSetupStatus(_req, res, next) {
        try {
            const result = await auth_service_js_1.AuthService.getSetupStatus();
            res.status(200).json({ data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async performSetup(req, res, next) {
        try {
            const result = await auth_service_js_1.AuthService.performSetup(req.body, req.ip);
            res.status(201).json({ data: result });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
