"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const users_service_js_1 = require("./users.service.js");
class UsersController {
    static async getUsers(_req, res, next) {
        try {
            const data = await users_service_js_1.UsersService.getUsers();
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async createHr(req, res, next) {
        try {
            const data = await users_service_js_1.UsersService.createHrUser(req.ctx, req.body, req.ip);
            res.status(201).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async toggleDeactivate(req, res, next) {
        try {
            const data = await users_service_js_1.UsersService.toggleDeactivate(req.ctx, req.params.id, req.ip);
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async resetPassword(req, res, next) {
        try {
            const data = await users_service_js_1.UsersService.resetPassword(req.ctx, req.params.id, req.ip);
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
}
exports.UsersController = UsersController;
