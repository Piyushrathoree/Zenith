import { Queue, UnrecoverableError, Worker } from 'bullmq';
import { getRedisOptions } from '../../config/redis.ts';
import { CalendarConnection } from './calendar.model.ts';
import type { CalendarErrorCode } from './calendar.model.ts';
import { GoogleApiError, GoogleAuthError } from './calendar.google.ts';
import { deleteCalendarEvent, resyncAllForUser, syncTaskToCalendar } from './calendar.sync.ts';

type CalendarJobData = { userId: string; taskId?: string; eventId?: string };

const QUEUE_NAME = 'calendar-sync';

export const CalendarQueue = new Queue<CalendarJobData>(QUEUE_NAME, {
    connection: getRedisOptions(),
    defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 200,
        removeOnFail: 500,
    },
});

async function hasActiveConnection(userId: string): Promise<boolean> {
    return Boolean(await CalendarConnection.exists({ userId, status: 'active' }));
}

// These helpers never throw: a calendar problem must never fail the API request that caused it.
// Users without a calendar connection add no jobs at all.

export async function queueCalendarSync(userId: string, taskIds: string[]): Promise<void> {
    try {
        if (taskIds.length === 0 || !(await hasActiveConnection(userId))) return;
        await CalendarQueue.addBulk(taskIds.map((taskId) => ({ name: 'sync-task', data: { userId, taskId } })));
    } catch (error) {
        console.warn('[Calendar] could not queue sync:', error);
    }
}

export async function queueCalendarDelete(userId: string, eventIds: string[]): Promise<void> {
    try {
        if (eventIds.length === 0 || !(await hasActiveConnection(userId))) return;
        await CalendarQueue.addBulk(eventIds.map((eventId) => ({ name: 'delete-event', data: { userId, eventId } })));
    } catch (error) {
        console.warn('[Calendar] could not queue delete:', error);
    }
}

export async function queueCalendarResync(userId: string): Promise<void> {
    try {
        if (!(await hasActiveConnection(userId))) return;
        await CalendarQueue.add('resync-user', { userId });
    } catch (error) {
        console.warn('[Calendar] could not queue resync:', error);
    }
}

function calendarErrorCode(error: unknown): CalendarErrorCode {
    if (error instanceof GoogleAuthError) return 'needs_reconnect';
    if (error instanceof GoogleApiError && error.status === 429) return 'rate_limited';
    return 'provider_down';
}

// Health writes are best effort: they must never change whether a job succeeds or retries.
async function recordCalendarSuccess(userId: string): Promise<void> {
    try {
        await CalendarConnection.updateOne(
            { userId, status: 'active' },
            { $set: { lastSyncedAt: new Date() }, $unset: { lastError: '', lastErrorAt: '' } }
        );
    } catch (error) {
        console.warn('[Calendar] could not record sync health:', error);
    }
}

async function recordCalendarFailure(userId: string, error: unknown): Promise<void> {
    const code = calendarErrorCode(error);
    try {
        // A rejected access token also means the user must reconnect, so it revokes like a
        // rejected refresh token does (calendar.token.ts).
        const update = code === 'needs_reconnect'
            ? { status: 'revoked', lastError: code, lastErrorAt: new Date() }
            : { lastError: code, lastErrorAt: new Date() };
        await CalendarConnection.updateOne({ userId }, { $set: update });
    } catch (saveError) {
        console.warn('[Calendar] could not record sync failure:', saveError);
    }
}

export const startCalendarWorker = (): void => {
    const worker = new Worker<CalendarJobData>(
        QUEUE_NAME,
        async (job) => {
            try {
                if (job.name === 'sync-task' && job.data.taskId) {
                    await syncTaskToCalendar(job.data.userId, job.data.taskId);
                } else if (job.name === 'delete-event' && job.data.eventId) {
                    await deleteCalendarEvent(job.data.userId, job.data.eventId);
                } else if (job.name === 'resync-user') {
                    await resyncAllForUser(job.data.userId);
                }
                await recordCalendarSuccess(job.data.userId);
            } catch (error) {
                await recordCalendarFailure(job.data.userId, error);
                // The connection is now marked revoked, so retrying cannot help.
                if (error instanceof GoogleAuthError) throw new UnrecoverableError(error.message);
                throw error;
            }
        },
        // Concurrency 1: two jobs for the same task must never race and create two events.
        { connection: getRedisOptions(), concurrency: 1 }
    );

    worker.on('failed', (job, err) => {
        console.error(`❌ [Calendar] ${job?.name} failed: ${err.message}`);
    });

    console.log(`📅 Calendar worker listening on '${QUEUE_NAME}'...`);
};
