"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollController = void 0;
const payroll_service_js_1 = require("./payroll.service.js");
class PayrollController {
    static async createDraftRun(req, res, next) {
        try {
            const run = await payroll_service_js_1.PayrollService.createDraftRun(req.body.month, req.ctx);
            res.status(201).json({ success: true, data: run });
        }
        catch (err) {
            next(err);
        }
    }
    static async getRuns(_req, res, next) {
        try {
            const runs = await payroll_service_js_1.PayrollService.getRuns();
            res.json({ success: true, data: runs });
        }
        catch (err) {
            next(err);
        }
    }
    static async getRunById(req, res, next) {
        try {
            const run = await payroll_service_js_1.PayrollService.getRunById(req.params.id);
            res.json({ success: true, data: run });
        }
        catch (err) {
            next(err);
        }
    }
    static async regenerateDraftRun(req, res, next) {
        try {
            const run = await payroll_service_js_1.PayrollService.regenerateDraftRun(req.params.id, req.ctx);
            res.json({ success: true, data: run });
        }
        catch (err) {
            next(err);
        }
    }
    static async finalizeRun(req, res, next) {
        try {
            const run = await payroll_service_js_1.PayrollService.finalizeRun(req.params.id, req.ctx);
            res.json({ success: true, data: run });
        }
        catch (err) {
            next(err);
        }
    }
    static async getPayslips(req, res, next) {
        try {
            const payslips = await payroll_service_js_1.PayrollService.getPayslips(req.ctx);
            res.json({ success: true, data: payslips });
        }
        catch (err) {
            next(err);
        }
    }
    static async getPayslipPdf(req, res, next) {
        try {
            const { doc, filename } = await payroll_service_js_1.PayrollService.getPayslipPdf(req.params.id, req.ctx);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            doc.pipe(res);
            doc.end();
        }
        catch (err) {
            next(err);
        }
    }
}
exports.PayrollController = PayrollController;
