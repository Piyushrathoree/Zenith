import { type DateKey, localDateTime, parseDurationToMinutes, utcMidnightToDateKey } from '../../utils/time.ts';

export interface SyncableTask {
    _id: unknown;
    taskDescription: string;
    notes?: string;
    link?: string;
    status: string;
    due?: Date;
    startTime?: string;
    duration?: string;
    inBacklog?: boolean;
}

/** A task belongs in the calendar only when it has a day and a time and is not in the backlog. */
export function shouldHaveEvent(task: SyncableTask | null): task is SyncableTask & { due: Date; startTime: string } {
    return Boolean(task && task.due && task.startTime && !task.inBacklog);
}

export function buildEventBody(
    task: SyncableTask & { due: Date; startTime: string },
    options: { timeZone: string; reminderMinutes: number; frontendUrl: string }
) {
    const dayKey: DateKey = utcMidnightToDateKey(task.due);
    const minutes = parseDurationToMinutes(task.duration, 60);

    return {
        summary: task.status === 'done' ? `✓ ${task.taskDescription}` : task.taskDescription,
        description: [task.notes, task.link, `Open in Zenith: ${options.frontendUrl}/dashboard`]
            .filter(Boolean)
            .join('\n\n'),
        start: { dateTime: localDateTime(dayKey, task.startTime), timeZone: options.timeZone },
        end: { dateTime: localDateTime(dayKey, task.startTime, minutes), timeZone: options.timeZone },
        reminders: {
            useDefault: false,
            overrides: options.reminderMinutes > 0 ? [{ method: 'popup', minutes: options.reminderMinutes }] : [],
        },
        // Lets the sync find the Zenith task from the event, for example when debugging.
        extendedProperties: { private: { zenithTaskId: String(task._id) } },
    };
}
