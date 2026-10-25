"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiController = void 0;
const ai_service_js_1 = require("./ai.service.js");
class AiController {
    static async chat(req, res, next) {
        try {
            const result = await ai_service_js_1.AiService.chat(req.body.message, req.ctx);
            res.json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
    static async summary(req, res, next) {
        try {
            const result = await ai_service_js_1.AiService.summarize(req.body, req.ctx);
            res.json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
    static async smartLeave(req, res, next) {
        try {
            const result = await ai_service_js_1.AiService.smartLeave(req.body.text, req.ctx);
            res.json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AiController = AiController;
