"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRouter = void 0;
const express_1 = require("express");
const ai_controller_js_1 = require("./ai.controller.js");
const auth_js_1 = require("../../middleware/auth.js");
const validate_js_1 = require("../../middleware/validate.js");
const zod_1 = require("zod");
const ChatSchema = zod_1.z.object({
    body: zod_1.z.object({
        message: zod_1.z.string().min(1, 'Message is required'),
    }),
});
const SmartLeaveSchema = zod_1.z.object({
    body: zod_1.z.object({
        text: zod_1.z.string().min(3, 'Query text must be at least 3 characters'),
    }),
});
exports.aiRouter = (0, express_1.Router)();
exports.aiRouter.use(auth_js_1.authenticate, auth_js_1.mustChangePasswordGuard);
// 1. POST /api/ai/chat (All roles)
exports.aiRouter.post('/chat', (0, validate_js_1.validate)(ChatSchema), ai_controller_js_1.AiController.chat);
// 2. POST /api/ai/summary (Admin/HR only)
exports.aiRouter.post('/summary', (0, auth_js_1.requireRole)(['admin', 'hr']), ai_controller_js_1.AiController.summary);
// 3. POST /api/ai/smart-leave (All roles with employee profile)
exports.aiRouter.post('/smart-leave', (0, validate_js_1.validate)(SmartLeaveSchema), ai_controller_js_1.AiController.smartLeave);
