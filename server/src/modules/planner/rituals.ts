import { type DateKey, addDaysToKey, parseDurationToMinutes, utcMidnightToDateKey } from '../../utils/time.ts';

// Pure summary math for the guided rituals (Phase 8). The database queries live in
// rituals.controller.ts, so these can be unit tested without Mongo.

export interface RitualTask {
    _id: unknown;
    status: string;
    duration?: string;
    due?: Date | null;
    backlogFromDue?: Date | null;
    inBacklog?: boolean;
    skipCount?: number;
}

export interface DaySummary<T> {
    plannedCount: number;
    plannedMinutes: number;
    doneCount: number;
    done: T[];
    open: T[];
    /** Open tasks that the rollover carried forward at least once. */
    carriedOver: T[];
}

export function summarizeDay<T extends RitualTask>(tasks: T[]): DaySummary<T> {
    const done = tasks.filter((task) => task.status === 'done');
    const open = tasks.filter((task) => task.status !== 'done');
    return {
        plannedCount: tasks.length,
        plannedMinutes: tasks.reduce((sum, task) => sum + parseDurationToMinutes(task.duration, 60), 0),
        doneCount: done.length,
        done,
        open,
        carriedOver: open.filter((task) => (task.skipCount ?? 0) > 0),
    };
}

export interface WeekDay {
    date: DateKey;
    plannedCount: number;
    plannedMinutes: number;
    doneCount: number;
}

export interface WeekSummary<T> {
    days: WeekDay[];
    done: T[];
    /** Unfinished work from this week: moved to the backlog by rollover, or still open on a past day. */
    slipped: T[];
}

export function summarizeWeek<T extends RitualTask>(tasks: T[], weekStart: DateKey, today: DateKey): WeekSummary<T> {
    const dayKeys = Array.from({ length: 7 }, (_, i) => addDaysToKey(weekStart, i));
    const inWeek = (key: DateKey | null) => key !== null && key >= weekStart && key <= dayKeys[6];
    const keyOf = (date?: Date | null) => (date ? utcMidnightToDateKey(new Date(date)) : null);

    const days: WeekDay[] = dayKeys.map((date) => {
        const onDay = tasks.filter((task) => !task.inBacklog && keyOf(task.due) === date);
        return {
            date,
            plannedCount: onDay.length,
            plannedMinutes: onDay.reduce((sum, task) => sum + parseDurationToMinutes(task.duration, 60), 0),
            doneCount: onDay.filter((task) => task.status === 'done').length,
        };
    });

    const done = tasks.filter((task) => task.status === 'done' && (inWeek(keyOf(task.due)) || inWeek(keyOf(task.backlogFromDue))));
    const slipped = tasks.filter((task) => {
        if (task.status === 'done') return false;
        if (task.inBacklog) return inWeek(keyOf(task.backlogFromDue));
        const due = keyOf(task.due);
        return inWeek(due) && due !== null && due < today;
    });

    return { days, done, slipped };
}
