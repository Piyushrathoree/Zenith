import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { Redis } from 'ioredis';
import type { Request, Response } from 'express';
import { PLAN_LIMITS } from '../config/planLimits.ts';
import { env } from '../config/env.ts';

// Shared Redis client for rate limiting store
const redisClient = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    maxRetriesPerRequest: null,
});

redisClient.on('connect', () => console.log('✅ Rate limiter Redis connected'));
redisClient.on('error', (err) => console.error('❌ Rate limiter Redis error:', err));

/**
 * Custom 429 response sent when a rate limit is hit.
 */
const rateLimitHandler = (req: Request, res: Response) => {
    res.status(429).json({
        success: false,
        statusCode: 429,
        message: 'Too many requests — please slow down.',
        retryAfter: res.getHeader('Retry-After'),
        upgradeInfo: req.userPlan === 'free'
            ? 'Upgrade to Pro for 200 requests/min'
            : null,
    });
};

/**
 * apiLimiter — applied to all authenticated API routes.
 *
 * Key: req.userId (per-user buckets — each user has their own counter in Redis)
 * Limit: dynamic based on plan (free = 30/min, pro = 200/min)
 * Trial users: treated as 'pro' since isTrialActive bypasses lower limits
 */
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: (req: Request) => {
        // Trial users or pro users get higher limit
        const effectivePlan = req.isTrialActive ? 'pro' : (req.userPlan ?? 'free');
        return PLAN_LIMITS[effectivePlan].rateLimit;
    },
    keyGenerator: (req: Request) => {
        // Per-user bucket; fall back to IP for unauthenticated requests
        return req.userId ?? req.ip ?? 'anonymous';
    },
    store: new RedisStore({
        sendCommand: (...args: string[]) => redisClient.call(...args as [string, ...string[]]) as any,
        prefix: 'rl:api:',
    }),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: (req: Request) => !req.userId, // skip if not authenticated (handled by authLimiter)
});

/**
 * authLimiter — applied to login/register/forgot-password routes.
 *
 * Key: IP address (not userId, because user may not be authenticated yet)
 * Limit: 10 requests per minute — strict, to prevent brute-force attacks
 */
export const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    keyGenerator: (req: Request) => req.ip ?? 'anonymous',
    store: new RedisStore({
        sendCommand: (...args: string[]) => redisClient.call(...args as [string, ...string[]]) as any,
        prefix: 'rl:auth:',
    }),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
        res.status(429).json({
            success: false,
            statusCode: 429,
            message: 'Too many attempts — please wait a minute and try again.',
        });
    },
});
