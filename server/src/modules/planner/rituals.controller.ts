import type { Request, Response } from 'express';
import { z } from 'zod';
import { Task } from './task.model.ts';
import { DailyPlanner } from './dailyPlanner.model.ts';
import { summarizeDay, summarizeWeek } from './rituals.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { ApiResponse } from '../../utils/ApiResponse.ts';
import {
    addDaysToKey,
    dateKeyToUtcMidnight,
    isDateKey,
    localDateKey,
    utcMidnightToDateKey,
} from '../../utils/time.ts';

// Guided rituals (Phase 8): summaries for daily planning, shutdown, weekly planning and review,
// plus the daily planned / shut down markers and highlights.

export const UpdateDailyRitualSchema = z.object({
    planned: z.boolean().optional(),
    shutdown: z.boolean().optional(),
    highlight: z.string().trim().max(500).optional(),
    reflection: z.string().max(5000).optional(),
});

function plannerDTO(date: string, planner: { plannedAt?: Date; shutdownAt?: Date; highlight?: string; reflection?: string } | null) {
    return {
        date,
        plannedAt: planner?.plannedAt?.toISOString() ?? null,
        shutdownAt: planner?.shutdownAt?.toISOString() ?? null,
        highlight: planner?.highlight ?? '',
        reflection: planner?.reflection ?? '',
    };
}

function dateParam(req: Request, res: Response, name: string): string | null {
    const value = req.params[name];
    if (!isDateKey(value)) {
        res.status(400).json(new ApiError(400, `${name} must be yyyy-MM-dd`));
        return null;
    }
    return value;
}

/** GET /planner/daily/:date/summary: the day's tasks (done, open, carried over) and ritual markers. */
export const getDailySummary = async (req: Request, res: Response): Promise<void> => {
    const date = dateParam(req, res, 'date');
    if (!date) return;

    const [tasks, planner] = await Promise.all([
        Task.find({ userId: req.userId, inBacklog: { $ne: true }, due: dateKeyToUtcMidnight(date) }).lean(),
        DailyPlanner.findOne({ userId: req.userId, date: dateKeyToUtcMidnight(date) }).lean(),
    ]);

    const summary = summarizeDay(tasks);
    res.status(200).json(new ApiResponse(200, {
        ...plannerDTO(date, planner),
        plannedCount: summary.plannedCount,
        plannedMinutes: summary.plannedMinutes,
        doneCount: summary.doneCount,
        done: summary.done,
        open: summary.open,
        carriedOver: summary.carriedOver,
    }, 'Daily summary fetched'));
};

/** PUT /planner/daily/:date: mark the day planned or shut down, and save the highlight. */
export const updateDailyRitual = async (req: Request, res: Response): Promise<void> => {
    const date = dateParam(req, res, 'date');
    if (!date) return;

    const { planned, shutdown, highlight, reflection } = req.body;
    const $set: Record<string, unknown> = {};
    if (planned === true) $set.plannedAt = new Date();
    if (shutdown === true) $set.shutdownAt = new Date();
    if (highlight !== undefined) $set.highlight = highlight;
    if (reflection !== undefined) $set.reflection = reflection;

    const planner = await DailyPlanner.findOneAndUpdate(
        { userId: req.userId, date: dateKeyToUtcMidnight(date) },
        { $set },
        { new: true, upsert: true }
    ).lean();

    res.status(200).json(new ApiResponse(200, plannerDTO(date, planner), 'Daily ritual saved'));
};

/** GET /planner/daily?from&to: days with a highlight or reflection, newest first (the highlights journal). */
export const listDailyHighlights = async (req: Request, res: Response): Promise<void> => {
    const today = localDateKey(new Date(), req.userTimezone ?? 'UTC');
    const to = isDateKey(req.query.to) ? req.query.to : today;
    const from = isDateKey(req.query.from) ? req.query.from : addDaysToKey(to, -60);

    const days = await DailyPlanner.find({
        userId: req.userId,
        date: { $gte: dateKeyToUtcMidnight(from), $lte: dateKeyToUtcMidnight(to) },
        $or: [{ highlight: { $nin: ['', null] } }, { reflection: { $nin: ['', null] } }],
    }).sort({ date: -1 }).limit(100).lean();

    res.status(200).json(new ApiResponse(
        200,
        days.map((day) => plannerDTO(utcMidnightToDateKey(day.date), day)),
        'Highlights fetched'
    ));
};

/** GET /planner/weekly/:weekStart/summary: per day totals, done and slipped tasks for the week. */
export const getWeeklySummary = async (req: Request, res: Response): Promise<void> => {
    const weekStart = dateParam(req, res, 'weekStart');
    if (!weekStart) return;

    const range = {
        $gte: dateKeyToUtcMidnight(weekStart),
        $lt: dateKeyToUtcMidnight(addDaysToKey(weekStart, 7)),
    };
    const tasks = await Task.find({
        userId: req.userId,
        $or: [{ due: range }, { backlogFromDue: range }],
    }).lean();

    const today = localDateKey(new Date(), req.userTimezone ?? 'UTC');
    res.status(200).json(new ApiResponse(200, { weekStart, ...summarizeWeek(tasks, weekStart, today) }, 'Weekly summary fetched'));
};
