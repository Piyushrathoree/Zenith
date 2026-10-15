// One time migration: converts existing Task.startTime values such as "7:00 am" to 24h "HH:mm".
// Safe to run more than once. Run with: cd server && bun scripts/migrate-start-time.ts
import mongoose from 'mongoose';
import { env } from '../src/config/env.ts';
import { Task } from '../src/modules/planner/task.model.ts';
import { normalizeStartTime } from '../src/utils/time.ts';

await mongoose.connect(env.MONGO_URI);

const tasks = await Task.find({ startTime: { $exists: true, $ne: '' } }).select('startTime');
let updated = 0;
for (const task of tasks) {
    const normalized = normalizeStartTime(task.startTime ?? '');
    const next = normalized === null ? '' : normalized; // unreadable values are cleared
    if (next !== task.startTime) {
        await Task.updateOne({ _id: task._id }, { $set: { startTime: next } });
        updated += 1;
    }
}

console.log(`Normalised startTime on ${updated} of ${tasks.length} tasks`);
await mongoose.disconnect();
