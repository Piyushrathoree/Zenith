import User from '../modules/auth/auth.model.ts';
import { RecurringTask } from '../modules/planner/recurringTask.model.ts';
import { materializeRule } from '../modules/planner/recurrence.ts';
import { queueCalendarSync } from '../modules/calendar/calendar.queue.ts';

/** Tops up the 14 day window for every active rule. Idempotent. */
export async function runRecurringMaterialize(): Promise<void> {
    const timezoneCache = new Map<string, string>();
    let created = 0;

    for await (const rule of RecurringTask.find({ active: true }).cursor()) {
        const userId = String(rule.userId);
        let timeZone = timezoneCache.get(userId);
        if (!timeZone) {
            const user = await User.findById(userId).select('timezone').lean();
            if (!user) continue; // user deleted, skip their rules
            timeZone = user.timezone || 'UTC';
            timezoneCache.set(userId, timeZone);
        }

        try {
            const createdIds = await materializeRule(rule, timeZone);
            created += createdIds.length;
            await queueCalendarSync(userId, createdIds);
        } catch (error) {
            console.error(`[Recurring] rule ${rule._id} failed:`, error);
        }
    }

    console.log(`[Recurring] materialize done, ${created} tasks created`);
}
