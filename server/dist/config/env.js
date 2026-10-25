"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().default(5000),
    CLIENT_URL: zod_1.z.string().default('http://localhost:5173'),
    MONGODB_URI: zod_1.z.string().default('mongodb://127.0.0.1:27017/hcm_lite'),
    JWT_SECRET: zod_1.z.string().min(8, 'JWT_SECRET must be at least 8 characters long'),
    JWT_EXPIRES_IN: zod_1.z.string().default('8h'),
    BCRYPT_ROUNDS: zod_1.z.coerce.number().default(10),
    COMPANY_NAME: zod_1.z.string().optional().default(''),
    ADMIN_EMAIL: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    ADMIN_PASSWORD: zod_1.z.string().optional().default(''),
    COMPANY_TIMEZONE: zod_1.z.string().default('Asia/Karachi'),
    AI_PROVIDER: zod_1.z.string().default('gemini'),
    AI_API_KEY: zod_1.z.string().optional().default(''),
    AI_MODEL: zod_1.z.string().default('gemini-2.0-flash'),
    AI_BASE_URL: zod_1.z.string().optional().default(''),
    AI_TIMEOUT_MS: zod_1.z.coerce.number().default(15000),
    AI_RATE_LIMIT_PER_HOUR: zod_1.z.coerce.number().default(20),
    LOGIN_RATE_LIMIT_PER_15MIN: zod_1.z.coerce.number().default(20),
});
const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(parsedEnv.error.format(), null, 2));
    process.exit(1);
}
exports.env = parsedEnv.data;
