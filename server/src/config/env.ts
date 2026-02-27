import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
    PORT: z.coerce.number().default(8000),
    MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),

    // Redis — accept either individual host/port or a full URL
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

    // AES-256 requires exactly 32 chars
    ENCRYPTION_KEY: z.string().length(32, 'ENCRYPTION_KEY must be exactly 32 characters'),

    // URLs
    FRONTEND_URL: z.string().default('http://localhost:3000'),
    API_BASE_URL: z.string().default('http://localhost:8000'),
});

// Will throw on startup if any required env var is missing or invalid
// This gives you a clear error message immediately instead of a cryptic runtime crash
export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
