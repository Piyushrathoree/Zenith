import type { Request, Response, NextFunction } from 'express';
import { PLAN_LIMITS } from '../config/planLimits.ts';
import { ApiError } from '../utils/ApiError.ts';
import { Task } from '../modules/planner/task.model.ts';

/**
 * Returns the effective plan for a user.
 * Trial users get pro-level access regardless of their stored plan.
 */
const getEffectivePlan = (req: Request): keyof typeof PLAN_LIMITS => {
    return req.isTrialActive ? 'pro' : (req.userPlan ?? 'free');
};

/**
 * gateIntegrations — blocks integration routes for free users (trial expired).
 *
 * Applied to the entire /api/v1/integrations router.
 *
 * Free user response:
 *   403 "Upgrade to Pro to use integrations (GitHub, Gmail, Notion)"
 */
export const gateIntegrations = (req: Request, res: Response, next: NextFunction): void => {
    const plan = getEffectivePlan(req);
    if (!PLAN_LIMITS[plan].integrations) {
        res.status(403).json(new ApiError(
            403,
            'Upgrade to Pro to use integrations (GitHub, Gmail, Notion)'
        ));
        return;
    }
    next();
};

/**
 * gateTaskLimit — prevents free users from creating more than 4 tasks.
 *
 * Applied before createTask only.
 * Counts the user's current tasks in DB before allowing the create.
 *
 * Free user response (when at/over limit):
 *   403 "Free plan is limited to 4 tasks — upgrade to Pro for unlimited tasks"
 */
export const gateTaskLimit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const plan = getEffectivePlan(req);
    const maxTasks = PLAN_LIMITS[plan].maxTasks;

    if (maxTasks === Infinity) {
        next();
        return;
    }

    try {
        const taskCount = await Task.countDocuments({ userId: req.userId });
        if (taskCount >= maxTasks) {
            res.status(403).json(new ApiError(
                403,
                `Free plan is limited to ${maxTasks} tasks — upgrade to Pro for unlimited tasks`
            ));
            return;
        }
        next();
    } catch {
        res.status(500).json(new ApiError(500, 'Failed to check task limit'));
    }
};

/**
 * gatePlannerRange — prevents free users from planning beyond tomorrow.
 *
 * Applied before updateDailyPlanner (which takes a :date param).
 * Free users: can only plan for today (day 0) and tomorrow (day 1).
 *
 * Free user response (when date is beyond tomorrow):
 *   403 "Free plan can only plan up to tomorrow — upgrade to Pro to plan ahead"
 */
export const gatePlannerRange = (req: Request, res: Response, next: NextFunction): void => {
    const plan = getEffectivePlan(req);
    const maxDays = PLAN_LIMITS[plan].plannerDays;

    if (maxDays === Infinity) {
        next();
        return;
    }

    const { date } = req.params;
    if (!date) {
        next();
        return;
    }

    const targetDate = new Date(Array.isArray(date) ? date[0] : date);
    targetDate.setUTCHours(0, 0, 0, 0);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Difference in days
    const diffDays = Math.round(
        (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays > maxDays) {
        res.status(403).json(new ApiError(
            403,
            'Free plan can only plan up to tomorrow — upgrade to Pro to plan further ahead'
        ));
        return;
    }

    next();
};
