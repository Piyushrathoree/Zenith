import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
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
 * gateTaskLimit — prevents free users from putting more than 4 tasks on one day.
 *
 * Applied on create, and on update when the request moves a task (`due`).
 * Counts tasks whose `due` date falls on that same UTC calendar day.
 *
 * Free user response (when that day is full):
 *   403 "Free plan is limited to 4 tasks a day. Upgrade to Pro for unlimited tasks."
 */
export const gateTaskLimit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const plan = getEffectivePlan(req);
    const maxTasks = PLAN_LIMITS[plan].maxTasks;

    if (maxTasks === Infinity) {
        next();
        return;
    }

    const dueRaw = req.body?.due;
    if (req.method !== 'POST' && dueRaw === undefined) {
        next();
        return;
    }

    try {
        const target = dueRaw ? new Date(dueRaw) : new Date();
        if (Number.isNaN(target.getTime())) {
            res.status(400).json(new ApiError(400, 'due must be a valid date'));
            return;
        }

        const start = new Date(Date.UTC(
            target.getUTCFullYear(),
            target.getUTCMonth(),
            target.getUTCDate(),
        ));
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);

        const filter: Record<string, unknown> = {
            userId: req.userId,
            due: { $gte: start, $lt: end },
        };

        const taskId = req.params.taskId;
        if (typeof taskId === 'string' && Types.ObjectId.isValid(taskId)) {
            filter._id = { $ne: new Types.ObjectId(taskId) };
        }

        const taskCount = await Task.countDocuments(filter);
        if (taskCount >= maxTasks) {
            res.status(403).json(new ApiError(
                403,
                `Free plan is limited to ${maxTasks} tasks a day. Upgrade to Pro for unlimited tasks.`
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
