"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationQuerySchema = void 0;
exports.buildPaginationResponse = buildPaginationResponse;
const zod_1 = require("zod");
exports.paginationQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
function buildPaginationResponse(data, total, page, limit) {
    const totalPages = Math.ceil(total / limit) || 1;
    return {
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    };
}
