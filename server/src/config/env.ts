import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/hcm_lite'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters long'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  BCRYPT_ROUNDS: z.coerce.number().default(10),
  COMPANY_NAME: z.string().optional().default(''),
  ADMIN_EMAIL: z.string().email().optional().or(z.literal('')),
  ADMIN_PASSWORD: z.string().optional().default(''),
  COMPANY_TIMEZONE: z.string().default('Asia/Karachi'),
  AI_PROVIDER: z.string().default('gemini'),
  AI_API_KEY: z.string().optional().default(''),
  AI_MODEL: z.string().default('gemini-2.0-flash'),
  AI_BASE_URL: z.string().optional().default(''),
  AI_TIMEOUT_MS: z.coerce.number().default(15000),
  AI_RATE_LIMIT_PER_HOUR: z.coerce.number().default(20),
  LOGIN_RATE_LIMIT_PER_15MIN: z.coerce.number().default(20),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;
