import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  PORT: z.coerce.number().default(8003),
  DATABASE_URL: z.string().min(1, "Database URL is required"),
  
  // This must be 32 characters long for AES-256
  ENCRYPTION_KEY: z.string().length(32, "ENCRYPTION_KEY must be exactly 32 characters"),
  
  // URLs
  API_BASE_URL: z.string().default('http://localhost:8000'), // Gateway URL
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  
  // Provider Secrets
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),

  // notion later   
});

export const env = envSchema.parse(process.env);