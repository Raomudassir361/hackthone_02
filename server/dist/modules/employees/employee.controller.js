"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeController = void 0;
const employee_service_js_1 = require("./employee.service.js");
class EmployeeController {
    static async createEmployee(req, res, next) {
        try {
            const data = await employee_service_js_1.EmployeeService.createEmployee(req.ctx, req.body, req.ip);
            res.status(201).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async updateEmployee(req, res, next) {
        try {
            const data = await employee_service_js_1.EmployeeService.updateEmployee(req.ctx, req.params.id, req.body, req.ip);
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async getEmployees(req, res, next) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = await employee_service_js_1.EmployeeService.getEmployees(req.ctx, req.query);
            res.status(200).json(data);
        }
        catch (e) {
            next(e);
        }
    }
    static async getEmployeeById(req, res, next) {
        try {
            const data = await employee_service_js_1.EmployeeService.getEmployeeById(req.ctx, req.params.id);
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async updateOwnProfile(req, res, next) {
        try {
            const data = await employee_service_js_1.EmployeeService.updateOwnProfile(req.ctx, req.body, req.ip);
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async getSalary(req, res, next) {
        try {
            const data = await employee_service_js_1.EmployeeService.getSalary(req.ctx, req.params.id);
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async updateSalary(req, res, next) {
        try {
            const data = await employee_service_js_1.EmployeeService.updateSalary(req.ctx, req.params.id, req.body, req.ip);
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async importCsv(req, res, next) {
        try {
            const dryRun = req.query.dryRun === 'true';
            const data = await employee_service_js_1.EmployeeService.importCsv(req.ctx, req.body.csvContent, dryRun, req.ip);
            res.status(200).json({ data });
        }
        catch (e) {
            next(e);
        }
    }
    static async exportCsv(_req, res, next) {
        try {
            const csv = await employee_service_js_1.EmployeeService.exportCsv();
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="employees.csv"');
            res.status(200).send(csv);
        }
        catch (e) {
            next(e);
        }
    }
}
exports.EmployeeController = EmployeeController;
