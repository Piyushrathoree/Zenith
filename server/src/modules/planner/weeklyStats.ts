import { parseDurationToMinutes } from '../../utils/time.ts';

export interface StatsTask {
    status: string;
    duration?: string;
}

export interface WeeklyStats {
    weekStart: string;
    plannedCount: number;
    doneCount: number;
    plannedMinutes: number;
    doneMinutes: number;
}

/** Counts and minutes for one week. Pure: the database query happens in weekly.controller.ts. */
export function computeWeeklyStats(weekStart: string, tasks: StatsTask[]): WeeklyStats {
    let plannedMinutes = 0;
    let doneMinutes = 0;
    let doneCount = 0;
    for (const task of tasks) {
        const minutes = parseDurationToMinutes(task.duration, 60);
        plannedMinutes += minutes;
        if (task.status === 'done') {
            doneCount += 1;
            doneMinutes += minutes;
        }
    }
    return { weekStart, plannedCount: tasks.length, doneCount, plannedMinutes, doneMinutes };
}
