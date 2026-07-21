import { z } from 'zod';
import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

// Railway production API. Override anytime with API_BASE_URL in the host env.
const PROD_API_BASE_URL = 'https://zenith-production-b6d0.up.railway.app';

const envSchema = z.object({
    PORT: z.coerce.number().default(8000),
    MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),

    // Redis — REDIS_URL preferred (Upstash: rediss://default:TOKEN@host:6379).
    // Falls back to REDIS_HOST/PORT for local Redis.
    REDIS_URL: z.string().optional(),
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().default(6379),

    // Email — Gmail SMTP
    GMAIL_USER: z.string().email('GMAIL_USER must be a valid email'),
    GMAIL_APP_PASSWORD: z.string().min(1, 'GMAIL_APP_PASSWORD is required'),

    // OAuth: Google
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),

    // OAuth: GitHub
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),

    // OAuth: Notion, optional, the Notion integration is disabled until these are set
    NOTION_CLIENT_ID: z.string().default(''),
    NOTION_CLIENT_SECRET: z.string().default(''),

    // AES-256 requires exactly 32 chars
    ENCRYPTION_KEY: z.string().length(32, 'ENCRYPTION_KEY must be exactly 32 characters'),

    // URLs — local defaults for dev; production API defaults to Railway when NODE_ENV=production.
    // Always set FRONTEND_URL on Railway to your real client origin (OAuth redirects back there).
    FRONTEND_URL: z.string().default('http://localhost:3000'),
    API_BASE_URL: z
        .string()
        .default(isProd ? PROD_API_BASE_URL : 'http://localhost:8000'),
});

// Will throw on startup if any required env var is missing or invalid
// This gives you a clear error message immediately instead of a cryptic runtime crash
export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
