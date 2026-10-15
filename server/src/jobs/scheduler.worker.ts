import { runPlannerRollover } from './rollover.job.ts';
import { runRecurringMaterialize } from './recurring.job.ts';
import { Worker } from 'bullmq';
import { getRedisOptions } from '../config/redis.ts';
import { SCHEDULER_QUEUE_NAME } from './scheduler.queue.ts';

/** Routes scheduled jobs by name. Later phases add cases here. */
export const startSchedulerWorker = (): void => {
    const worker = new Worker(
        SCHEDULER_QUEUE_NAME,
        async (job) => {
            switch (job.name) {
                case 'heartbeat':
                    console.log('[Scheduler] heartbeat');
                    break;
                case 'recurring-materialize':
                    await runRecurringMaterialize();
                    break;
                case 'planner-rollover':
                    await runPlannerRollover();
                    break;
                default:
                    console.warn(`[Scheduler] Unknown job name: ${job.name}`);
            }
        },
        { connection: getRedisOptions(), concurrency: 1 }
    );

    worker.on('failed', (job, err) => {
        console.error(`❌ [Scheduler] Job ${job?.id} (${job?.name}) failed: ${err.message}`);
    });

    console.log(`⏰ Scheduler worker listening on '${SCHEDULER_QUEUE_NAME}'...`);
};
