import { Queue } from 'bullmq';
import { getRedisOptions } from '../../config/redis.ts';
import type { EmailJobData } from './mail.ts';

/**
 * EmailQueue — BullMQ producer.
 *
 * Auth controllers add jobs here instead of sending email directly.
 * This means:
 *  - Email failures do NOT crash/block the API response
 *  - Failed jobs are automatically retried by BullMQ
 *  - Email sending can be scaled independently in the future
 *
 * Usage:
 *   await EmailQueue.add('send-verification-email', { email, code: '123456' });
 *   await EmailQueue.add('send-welcome-email', { email });
 *   await EmailQueue.add('send-forgot-password-email', { email, resetLink });
 */
export const EmailQueue = new Queue<EmailJobData>('email-queue', {
    connection: getRedisOptions(),
    defaultJobOptions: {
        attempts: 3,                // retry up to 3 times on failure
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,      // keep last 100 completed jobs for debugging
        removeOnFail: 200,
    },
});

console.log('📨 EmailQueue producer ready');
