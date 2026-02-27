/**
 * PLAN_LIMITS defines the feature boundaries for each subscription tier.
 *
 * During the 7-day trial, users have effective 'pro' access.
 * After trial, free users are restricted by these limits.
 *
 * How it's used:
 *   - rateLimit     → max API requests per minute (enforced by rateLimit.middleware.ts)
 *   - maxTasks      → enforced by gateTaskLimit() in featureGate.middleware.ts
 *   - plannerDays   → 1 = today + tomorrow only (enforced by gatePlannerRange())
 *   - integrations  → enforced by gateIntegrations()
 */
export const PLAN_LIMITS = {
    free: {
        rateLimit: 30,
        maxTasks: 4,
        plannerDays: 1,     // can only plan today (day 0) and tomorrow (day 1)
        integrations: false,
    },
    pro: {
        rateLimit: 200,
        maxTasks: Infinity,
        plannerDays: Infinity,
        integrations: true,
    },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;
