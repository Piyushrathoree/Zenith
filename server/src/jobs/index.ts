import { startEmailWorker } from '../modules/notification/email.worker.ts';
import { startSchedulerWorker } from './scheduler.worker.ts';
import { registerSchedules } from './scheduler.queue.ts';
import { startCalendarWorker } from '../modules/calendar/calendar.queue.ts';

/**
 * Starts every background worker and registers schedules. Later phases add workers here.
 *
 * Does not wait for Redis. The Redis client retries forever (maxRetriesPerRequest: null), so an
 * awaited call would hang on a Redis outage and the HTTP server would never listen. The API must
 * come up without Redis, so schedule registration runs in the background and logs any failure.
 */
export function startWorkers(): void {
    startEmailWorker();
    startSchedulerWorker();
    startCalendarWorker();
    registerSchedules().catch((error) => {
        console.error('❌ [Scheduler] could not register schedules:', error);
    });
}
