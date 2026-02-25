import { Queue } from "bullmq"

const port: number = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379
export const EmailQueue = new Queue("email-queue",{
    connection: {
        host: process.env.REDIS_HOST, 
        port: port,
    },
})

console.log("BullMQ producer is connected to Redis")