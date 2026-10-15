import type { Request, Response } from 'express';
import { Task } from './task.model.ts';
import { WeeklyPlan, type IWeeklyPlan } from './weeklyPlan.model.ts';
import { computeWeeklyStats } from './weeklyStats.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { ApiResponse } from '../../utils/ApiResponse.ts';
import {
    addDaysToKey,
    dateKeyToUtcMidnight,
    isDateKey,
    localDateKey,
    utcMidnightToDateKey,
    weekStartKey,
} from '../../utils/time.ts';

function toDTO(weekStart: string, plan: IWeeklyPlan | null) {
    return {
        weekStart,
        goals: plan?.goals ?? [],
        priorities: plan?.priorities ?? [],
        reviewNotes: plan?.reviewNotes ?? '',
        reflection: {
            wentWell: plan?.reflection?.wentWell ?? '',
            didnt: plan?.reflection?.didnt ?? '',
            change: plan?.reflection?.change ?? '',
        },
        planningCompletedAt: plan?.planningCompletedAt?.toISOString() ?? null,
        reviewCompletedAt: plan?.reviewCompletedAt?.toISOString() ?? null,
    };
}

async function statsFor(userId: string, weekStart: string) {
    const range = {
        $gte: dateKeyToUtcMidnight(weekStart),
        $lt: dateKeyToUtcMidnight(addDaysToKey(weekStart, 7)),
    };
    // A task moved to the backlog by the weekly rollover still counts toward the week it was planned in.
    const tasks = await Task.find({
        userId,
        $or: [{ due: range }, { backlogFromDue: range }],
    }).select('status duration').lean();
    return computeWeeklyStats(weekStart, tasks);
}

export const getCurrentWeek = async (req: Request, res: Response): Promise<void> => {
    const todayKey = localDateKey(new Date(), req.userTimezone ?? 'UTC');
    const weekStart = weekStartKey(todayKey, req.userWeekStartsOn ?? 1);
    const previousWeekStart = addDaysToKey(weekStart, -7);

    const [plan, stats, previousStats, backlogCount] = await Promise.all([
        WeeklyPlan.findOne({ userId: req.userId, weekStart: dateKeyToUtcMidnight(weekStart) }),
        statsFor(req.userId!, weekStart),
        statsFor(req.userId!, previousWeekStart),
        Task.countDocuments({ userId: req.userId, inBacklog: true }),
    ]);

    res.status(200).json(new ApiResponse(200, {
        weekStart,
        plan: toDTO(weekStart, plan),
        stats,
        previousStats,
        backlogCount,
    }, 'Weekly plan fetched successfully'));
};

export const updateWeeklyPlan = async (req: Request, res: Response): Promise<void> => {
    const weekStart = req.params.weekStart;
    if (!isDateKey(weekStart)) {
        res.status(400).json(new ApiError(400, 'weekStart must be yyyy-MM-dd'));
        return;
    }

    // Only the first day of a week is a valid key, so one week can never get two plans.
    if (weekStartKey(weekStart, req.userWeekStartsOn ?? 1) !== weekStart) {
        res.status(400).json(new ApiError(400, 'weekStart must be the first day of a week'));
        return;
    }

    const { goals, priorities, reviewNotes, reflection, planningCompleted, reviewCompleted } = req.body;
    const $set: Record<string, unknown> = {};
    if (goals !== undefined) $set.goals = goals;
    if (priorities !== undefined) $set.priorities = priorities;
    if (reviewNotes !== undefined) $set.reviewNotes = reviewNotes;
    if (reflection !== undefined) $set.reflection = reflection;
    if (planningCompleted === true) $set.planningCompletedAt = new Date();
    if (reviewCompleted === true) $set.reviewCompletedAt = new Date();

    const plan = await WeeklyPlan.findOneAndUpdate(
        { userId: req.userId, weekStart: dateKeyToUtcMidnight(weekStart) },
        { $set },
        { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(new ApiResponse(
        200,
        toDTO(utcMidnightToDateKey(plan.weekStart), plan),
        'Weekly plan saved'
    ));
};
