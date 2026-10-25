"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePayrollRunSchema = void 0;
const zod_1 = require("zod");
exports.CreatePayrollRunSchema = zod_1.z.object({
    body: zod_1.z.object({
        month: zod_1.z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'),
    }),
});
