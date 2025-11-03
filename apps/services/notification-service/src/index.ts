import dotenv from 'dotenv'
dotenv.config()

import { Worker } from 'bullmq'
import { Redis } from 'ioredis'
import { sendForgotPasswordMail, sendVerificationCode, sendWelcomeMail } from './mail/mail'


console.log("starting notification service worker ....")

interface emailJobPayload {
    email: string,
    verificationCode: string
}

const connection = new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null
})

if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('Missing GMAIL credentials. Worker will not start.');
    process.exit(1);
}

const worker = new Worker<emailJobPayload>(
    'email-queue',
    async (job) => {

        try {
            switch (job.name) {
                case 'send-verification-email':
                    await sendVerificationCode(job.data);
                    break;

                case 'send-welcome-email':
                    await sendWelcomeMail(job.data);
                    break;

                case 'send-forgot-password-email':
                    await sendForgotPasswordMail(job.data)
                    break;

                default:
                    console.warn(`[Job ${job.id}] Unknown job name: ${job.name}`);
                    break;
            }

        } catch (error: any) {
            console.error(`[Job ${job.id}] FAILED: ${error.message}`);
            throw error;

        }
    }, { connection }
)

worker.on('completed', (job) => {
    console.log(`[Queue] Job ${job.id} has been completed.`);
});

worker.on('failed', (job, err) => {
    console.log(`[Queue] Job ${job?.id} has failed with ${err.message}`);
});

console.log("Worker is listening for jobs on 'email-queue'...");

