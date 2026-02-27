import { Worker } from 'bullmq';
import { env } from '../../config/env.ts';
import { sendVerificationCode, sendWelcomeMail, sendForgotPasswordMail } from './mail.ts';
import type { EmailJobData } from './mail.ts';

/**
 * startEmailWorker — starts the BullMQ worker in-process.
 *
 * Called from src/index.ts on server startup.
 * The worker runs in the same Bun process as the Express server.
 *
 * Job names handled:
 *   - 'send-verification-email'   → sendVerificationCode
 *   - 'send-welcome-email'        → sendWelcomeMail
 *   - 'send-forgot-password-email'→ sendForgotPasswordMail
 */
export const startEmailWorker = (): void => {
    const worker = new Worker<EmailJobData>(
        'email-queue',
        async (job) => {
            switch (job.name) {
                case 'send-verification-email':
                    await sendVerificationCode(job.data);
                    break;
                case 'send-welcome-email':
                    await sendWelcomeMail(job.data);
                    break;
                case 'send-forgot-password-email':
                    await sendForgotPasswordMail(job.data);
                    break;
                default:
                    console.warn(`[EmailWorker] Unknown job name: ${job.name}`);
            }
        },
        {
            connection: { host: env.REDIS_HOST, port: env.REDIS_PORT },
            concurrency: 5, // process up to 5 emails at once
        }
    );

    worker.on('completed', (job) => {
        console.log(`✅ [EmailWorker] Job ${job.id} (${job.name}) completed`);
    });

    worker.on('failed', (job, err) => {
        console.error(`❌ [EmailWorker] Job ${job?.id} (${job?.name}) failed: ${err.message}`);
    });

    console.log("📬 Email worker listening on 'email-queue'...");
};
