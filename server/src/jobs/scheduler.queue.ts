import { Queue } from 'bullmq';
import { getRedisOptions } from '../config/redis.ts';

export const SCHEDULER_QUEUE_NAME = 'scheduled-jobs';

export const SchedulerQueue = new Queue(SCHEDULER_QUEUE_NAME, {
    connection: getRedisOptions(),
    defaultJobOptions: { removeOnComplete: 50, removeOnFail: 100 },
});

/**
 * Registers every recurring job. upsertJobScheduler is idempotent: calling it on every boot
 * updates the schedule instead of creating duplicates.
 * Later phases add their schedules here.
 */
export async function registerSchedules(): Promise<void> {
    await SchedulerQueue.upsertJobScheduler(
        'heartbeat',
        { every: 60 * 60 * 1000 },
        { name: 'heartbeat', data: {} }
    );
    // Carries unfinished tasks forward for every user whose local day has changed.
    await SchedulerQueue.upsertJobScheduler(
        'planner-rollover',
        { every: 15 * 60 * 1000 },
        { name: 'planner-rollover', data: {} }
    );
    // Keeps 14 days of recurring tasks generated ahead of time.
    await SchedulerQueue.upsertJobScheduler(
        'recurring-materialize',
        { every: 60 * 60 * 1000 },
        { name: 'recurring-materialize', data: {} }
    );
}
