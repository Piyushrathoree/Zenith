import { Task } from './task.model.ts';
import User from '../auth/auth.model.ts';
import { EmailQueue } from '../notification/email.producer.ts';
import { queueCalendarSync } from '../calendar/calendar.queue.ts';
import {
    type DateKey,
    addDaysToKey,
    dateKeyToUtcMidnight,
    localDateKey,
    utcMidnightToDateKey,
    weekStartKey,
} from '../../utils/time.ts';

export interface RolloverCandidate {
    id: string;
    dueKey: DateKey;
}

export interface RolloverPlan {
    rollIds: string[];
    backlogIds: string[];
}

/**
 * Pure decision function. Unfinished tasks from before today either roll to today (same week)
 * or go to the backlog (from an earlier week). See "The rule, exactly" in the Phase 5 doc.
 */
export function planRollover(input: {
    tasks: RolloverCandidate[];
    localToday: DateKey;
    weekStartsOn: 0 | 1;
}): RolloverPlan {
    const currentWeekStart = weekStartKey(input.localToday, input.weekStartsOn);
    const plan: RolloverPlan = { rollIds: [], backlogIds: [] };
    for (const task of input.tasks) {
        if (task.dueKey >= input.localToday) continue; // today or later: untouched
        if (task.dueKey < currentWeekStart) plan.backlogIds.push(task.id);
        else plan.rollIds.push(task.id);
    }
    return plan;
}

export interface RolloverResult {
    skipped: boolean;
    rolledCount: number;
    backlogCount: number;
}

const SKIPPED: RolloverResult = { skipped: true, rolledCount: 0, backlogCount: 0 };

/**
 * Runs the rollover for one user, at most once per local day. Safe to call from the scheduled
 * job and from the API at the same time.
 */
export async function runRolloverForUser(userId: string): Promise<RolloverResult> {
    const user = await User.findById(userId).select('email timezone weekStartsOn lastRolloverDate emailPrefs');
    if (!user) return SKIPPED;

    const timeZone = user.timezone || 'UTC';
    const weekStartsOn: 0 | 1 = user.weekStartsOn === 0 ? 0 : 1;
    const localToday = localDateKey(new Date(), timeZone);
    if (user.lastRolloverDate === localToday) return SKIPPED;

    // Atomic claim: only one caller wins for this user and day.
    const previousRolloverDate = user.lastRolloverDate;
    const claim = await User.updateOne(
        { _id: user._id, lastRolloverDate: { $ne: localToday } },
        { $set: { lastRolloverDate: localToday } }
    );
    if (claim.modifiedCount === 0) return SKIPPED;

    try {
        const todayMidnight = dateKeyToUtcMidnight(localToday);
        const candidates = await Task.find({
            userId: user._id,
            status: { $ne: 'done' },
            inBacklog: { $ne: true },
            recurringTaskId: { $exists: false },
            due: { $lt: todayMidnight },
        }).select('_id due taskDescription').lean();

        const plan = planRollover({
            tasks: candidates.map((task) => ({ id: String(task._id), dueKey: utcMidnightToDateKey(task.due!) })),
            localToday,
            weekStartsOn,
        });

        const now = new Date();
        if (plan.rollIds.length > 0) {
            await Task.updateMany(
                { _id: { $in: plan.rollIds }, userId: user._id },
                { $set: { due: todayMidnight, lastSkippedAt: now }, $inc: { skipCount: 1 } }
            );
        }
        if (plan.backlogIds.length > 0) {
            // Pipeline update (an array) so each task can copy its own `due` into backlogFromDue
            // before `due` is removed. `$inc` is not allowed in a pipeline, hence the $add.
            await Task.updateMany(
                { _id: { $in: plan.backlogIds }, userId: user._id },
                [
                    {
                        $set: {
                            backlogFromDue: '$due',
                            inBacklog: true,
                            backloggedAt: now,
                            backlogReason: 'auto',
                            startTime: '',
                            lastSkippedAt: now,
                            skipCount: { $add: [{ $ifNull: ['$skipCount', 0] }, 1] },
                        },
                    },
                    { $unset: 'due' },
                ]
            );
            if (user.emailPrefs?.weeklyBacklogDigest !== false) {
                const backlogSet = new Set(plan.backlogIds);
                const movedTitles = candidates
                    .filter((task) => backlogSet.has(String(task._id)))
                    .map((task) => task.taskDescription);
                await queueWeeklyBacklogEmail(String(user._id), user.email, localToday, weekStartsOn, movedTitles);
            }
        }

        // Rolled tasks moved to another day, and backlogged tasks lost their time. The calendar
        // sync brings both in line (it deletes the events of tasks that no longer have a time).
        await queueCalendarSync(String(user._id), [...plan.rollIds, ...plan.backlogIds]);

        return { skipped: false, rolledCount: plan.rollIds.length, backlogCount: plan.backlogIds.length };
    } catch (error) {
        // Release the claim so the next run retries today instead of waiting until tomorrow.
        await User.updateOne(
            { _id: user._id },
            previousRolloverDate
                ? { $set: { lastRolloverDate: previousRolloverDate } }
                : { $unset: { lastRolloverDate: '' } }
        );
        throw error;
    }
}

async function queueWeeklyBacklogEmail(
    userId: string,
    email: string,
    localToday: DateKey,
    weekStartsOn: 0 | 1,
    movedTitles: string[]
): Promise<void> {
    const weekStart = weekStartKey(localToday, weekStartsOn);
    const previousWeekStart = addDaysToKey(weekStart, -7);
    const [completedLastWeek, backlogTotal] = await Promise.all([
        Task.countDocuments({
            userId,
            status: 'done',
            due: { $gte: dateKeyToUtcMidnight(previousWeekStart), $lt: dateKeyToUtcMidnight(weekStart) },
        }),
        Task.countDocuments({ userId, inBacklog: true }),
    ]);

    await EmailQueue.add(
        'send-weekly-backlog-email',
        {
            email,
            weekly: {
                movedTitles: movedTitles.slice(0, 10),
                movedCount: movedTitles.length,
                completedLastWeek,
                backlogTotal,
            },
        },
        // One email per user per week, even if something retries.
        { jobId: `weekly-backlog-${userId}-${weekStart}` }
    );
}
