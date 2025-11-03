import dotenv from 'dotenv'
dotenv.config()

import { Worker } from 'bullmq'
import { Redis } from 'ioredis'
import { sendVerificationCode } from './mail/mail'


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
        const { email, verificationCode } = job.data
        console.log(`[Job ${job.id}] Processing: Send email to ${email}`);

        try {
            await sendVerificationCode(email, verificationCode);
            console.log(`[Job ${job.id}] SUCCESS: Email sent to ${email}`);
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

