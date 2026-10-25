"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const errors_js_1 = require("../shared/errors.js");
function errorHandler(err, _req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_next) {
    if (err instanceof errors_js_1.AppError) {
        res.status(err.statusCode).json({
            error: {
                code: err.code,
                message: err.message,
                details: err.details,
            },
        });
        return;
    }
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request data',
                details: err.format(),
            },
        });
        return;
    }
    console.error('Unhandled Error:', err);
    res.status(500).json({
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected internal error occurred',
        },
    });
}
