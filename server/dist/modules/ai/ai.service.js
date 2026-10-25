"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const llm_client_js_1 = require("./llm.client.js");
const ai_tools_js_1 = require("./ai.tools.js");
const ai_model_js_1 = require("./ai.model.js");
const leave_service_js_1 = require("../leave/leave.service.js");
const errors_js_1 = require("../../shared/errors.js");
const zod_1 = require("zod");
const SmartLeaveJsonSchema = zod_1.z.object({
    type: zod_1.z.string().min(1),
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: zod_1.z.string().min(2),
});
class AiService {
    static llm = new llm_client_js_1.LLMClient();
    /**
     * Helper: System policy text per rules.md Section 3.10
     */
    static getSystemPrompt(ctx) {
        const today = new Date().toISOString().split('T')[0];
        const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        return `You are the HCM Lite assistant. Answer using tool results or the policy below only.
Today is ${today} (${weekday}). User role is ${ctx.role}.
If something is not in the tool results or the policy, say you do not know.
Never reveal another employee's data to an Employee. Salary of other people is strictly private.

LANGUAGE SUPPORT:
You understand both English and Roman Urdu (e.g., "Meri chutti kitni bachi hai?", "Aaj kon late aya?", "Office ke timing kya hain?").
Respond in English or polite Roman Urdu matching the user's inquiry style.

POLICY
- Office start 09:00, grace 15 minutes. Check-in after 09:15 is late.
- Worked time under 5 hours is a half day.
- Weekend is Saturday and Sunday. Public holidays are set by Admin.
- A day with no attendance record and no approved leave is absent.
- Leave counts working days only (weekends and holidays are skipped).
- Yearly quotas: annual 14, sick 8, casual 10, unpaid unlimited.
- Overlapping leave or leave above the balance is not allowed.
- Payroll: gross = 1.5 x basic (HRA 40%, medical 10%). Per day = gross / working days.
  Deductions = absent days + unpaid leave days + 0.5 x half days. Joiners/leavers are prorated.
- Income tax is calculated on gross x 12 using the company slab. Admin finalizes payroll; finalized payroll is locked.`;
    }
    /**
     * Helper: Enforce rate limit (20 calls / user / hour)
     */
    static async checkRateLimit(userId) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const count = await ai_model_js_1.AiLogModel.countDocuments({
            userId,
            createdAt: { $gte: oneHourAgo },
        });
        if (count >= 20) {
            throw new errors_js_1.AppError('AI_RATE_LIMIT_EXCEEDED', 429, 'Hourly AI rate limit reached (20 requests per hour). Please try again later.');
        }
    }
    /**
     * POST /api/ai/chat (F19, F22)
     */
    static async chat(message, ctx) {
        await this.checkRateLimit(ctx.userId);
        const startTime = Date.now();
        const systemPrompt = this.getSystemPrompt(ctx);
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
        ];
        const toolCallsExecuted = [];
        let finalAnswer = '';
        try {
            // Step 1: LLM generates first response or tool call
            const firstResponse = await this.llm.generate(messages, ai_tools_js_1.AI_TOOLS);
            if (firstResponse.toolCall) {
                const { name, arguments: args } = firstResponse.toolCall;
                const toolResult = await ai_tools_js_1.AiToolsExecutor.execute(name, args, ctx);
                toolCallsExecuted.push({ name, args, result: toolResult });
                // Add tool interaction to message chain
                messages.push({
                    role: 'assistant',
                    content: `Invoking tool: ${name}`,
                });
                messages.push({
                    role: 'tool',
                    name,
                    content: JSON.stringify(toolResult),
                });
                // Step 2: Final response with tool results
                const secondResponse = await this.llm.generate(messages);
                finalAnswer = secondResponse.content || 'I have retrieved the requested data.';
            }
            else {
                finalAnswer = firstResponse.content || 'I do not have enough information to answer that.';
            }
            const latencyMs = Date.now() - startTime;
            await ai_model_js_1.AiLogModel.create({
                userId: ctx.userId,
                role: ctx.role,
                kind: 'chat',
                prompt: message,
                toolCalls: toolCallsExecuted,
                response: finalAnswer,
                latencyMs,
                status: 'success',
            });
            return {
                answer: finalAnswer,
                label: 'AI-generated',
                toolCalls: toolCallsExecuted,
            };
        }
        catch (err) {
            const latencyMs = Date.now() - startTime;
            const errorMsg = err instanceof Error ? err.message : 'Unknown AI error';
            await ai_model_js_1.AiLogModel.create({
                userId: ctx.userId,
                role: ctx.role,
                kind: 'chat',
                prompt: message,
                toolCalls: toolCallsExecuted,
                response: errorMsg,
                latencyMs,
                status: 'fallback',
            });
            if (err instanceof errors_js_1.AppError && err.statusCode === 429) {
                throw err;
            }
            // Friendly fallback
            return {
                answer: 'I am currently having difficulty connecting to the AI provider. According to company policy, office starts at 09:00 with a 15-minute grace period.',
                label: 'AI-generated (Fallback)',
                toolCalls: [],
            };
        }
    }
    /**
     * POST /api/ai/summary (F20)
     * Sends KPI JSON for current filters; returns 3–5 bullets using only those numbers.
     */
    static async summarize(kpiData, ctx) {
        await this.checkRateLimit(ctx.userId);
        const startTime = Date.now();
        const prompt = `Summarize the following organizational KPI data into 3 to 5 concise executive bullet points. Use ONLY the numbers present in this data; do not make up or extrapolate numbers:
${JSON.stringify(kpiData, null, 2)}`;
        const messages = [
            { role: 'system', content: this.getSystemPrompt(ctx) },
            { role: 'user', content: prompt },
        ];
        try {
            const res = await this.llm.generate(messages);
            const answer = res.content || '• Operational metrics within standard company thresholds.';
            await ai_model_js_1.AiLogModel.create({
                userId: ctx.userId,
                role: ctx.role,
                kind: 'summary',
                prompt,
                response: answer,
                latencyMs: Date.now() - startTime,
                status: 'success',
            });
            return {
                bullets: answer,
                label: 'AI-generated',
            };
        }
        catch {
            return {
                bullets: '• Metrics summarized across organizational departments.\n• System health operational within standard policy bounds.',
                label: 'AI-generated (Fallback)',
            };
        }
    }
    /**
     * POST /api/ai/smart-leave (F21)
     * Extracts leave details, validates with zod, recomputes working days on server, fallback on failure.
     */
    static async smartLeave(text, ctx) {
        const prompt = `Extract leave application intent from the user text. Return ONLY a valid JSON object matching:
{
  "type": "annual" | "sick" | "casual" | "unpaid",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "reason": string
}
User text: "${text}"`;
        const messages = [
            { role: 'system', content: this.getSystemPrompt(ctx) },
            { role: 'user', content: prompt },
        ];
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const res = await this.llm.generate(messages);
                let rawJson = res.content || '';
                // Extract json code block if wrapped
                const match = rawJson.match(/\{[\s\S]*\}/);
                if (match) {
                    rawJson = match[0];
                }
                const parsed = JSON.parse(rawJson);
                const validated = SmartLeaveJsonSchema.parse(parsed);
                const workingDays = await leave_service_js_1.LeaveService.calculateLeaveWorkingDays(validated.startDate, validated.endDate);
                return {
                    fallback: false,
                    data: {
                        leaveTypeKey: validated.type,
                        startDate: validated.startDate,
                        endDate: validated.endDate,
                        reason: validated.reason,
                        workingDays,
                    },
                };
            }
            catch {
                // Retry once on failure
                if (attempt === 1)
                    break;
            }
        }
        return { fallback: true };
    }
}
exports.AiService = AiService;
