import User from '../modules/auth/auth.model.ts';
import { runRolloverForUser } from '../modules/planner/rollover.ts';
import { localDateKey } from '../utils/time.ts';

/** Runs the rollover for every user whose local day changed since their last run. */
export async function runPlannerRollover(): Promise<void> {
    let processed = 0;
    const now = new Date();

    for await (const user of User.find({}).select('_id timezone lastRolloverDate').lean().cursor()) {
        if (user.lastRolloverDate === localDateKey(now, user.timezone || 'UTC')) continue;
        try {
            const result = await runRolloverForUser(String(user._id));
            if (!result.skipped) processed += 1;
        } catch (error) {
            console.error(`[Rollover] user ${user._id} failed:`, error);
        }
    }

    console.log(`[Rollover] done, ${processed} users rolled over`);
}
