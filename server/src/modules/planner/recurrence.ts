import { RRule } from 'rrule';
import type { HydratedDocument } from 'mongoose';
import { Task } from './task.model.ts';
import type { IRecurringTask } from './recurringTask.model.ts';
import {
    type DateKey,
    addDaysToKey,
    dateKeyToUtcMidnight,
    localDateKey,
    utcMidnightToDateKey,
} from '../../utils/time.ts';

/** How many days ahead tasks are generated. Matches the 14 board columns on the client. */
export const MATERIALIZE_WINDOW_DAYS = 14;

const ALLOWED_FREQUENCIES = [RRule.DAILY, RRule.WEEKLY, RRule.MONTHLY];

/** Returns an error message, or null when the rule is acceptable. */
export function validateRule(rrule: string): string | null {
    if (rrule.length > 200 || /DTSTART|TZID/i.test(rrule)) return 'Invalid repeat rule';
    try {
        const options = RRule.parseString(rrule);
        if (options.freq === undefined || !ALLOWED_FREQUENCIES.includes(options.freq)) {
            return 'Only daily, weekly or monthly repeats are supported';
        }
        return null;
    } catch {
        return 'Invalid repeat rule';
    }
}

/** Occurrence days in [from, to], both inclusive, minus exceptions. Pure, no database. */
export function expandOccurrences(input: {
    rrule: string;
    startsOn: DateKey;
    endsOn?: DateKey;
    from: DateKey;
    to: DateKey;
    exceptions: DateKey[];
}): DateKey[] {
    const options = RRule.parseString(input.rrule);
    options.dtstart = dateKeyToUtcMidnight(input.startsOn);
    if (input.endsOn) options.until = dateKeyToUtcMidnight(input.endsOn);
    const rule = new RRule(options);

    const from = input.from > input.startsOn ? input.from : input.startsOn;
    if (from > input.to) return [];

    const skip = new Set(input.exceptions);
    return rule
        .between(dateKeyToUtcMidnight(from), dateKeyToUtcMidnight(input.to), true)
        .map(utcMidnightToDateKey)
        .filter((key) => !skip.has(key));
}

/**
 * Creates the missing Task documents for this rule in the user's next 14 days.
 * Safe to call any number of times. Returns the ids of newly created tasks.
 */
export async function materializeRule(
    rule: HydratedDocument<IRecurringTask>,
    timeZone: string
): Promise<string[]> {
    if (!rule.active) return [];
    const today = localDateKey(new Date(), timeZone);
    const keys = expandOccurrences({
        rrule: rule.rrule,
        startsOn: utcMidnightToDateKey(rule.startsOn),
        endsOn: rule.endsOn ? utcMidnightToDateKey(rule.endsOn) : undefined,
        from: today,
        to: addDaysToKey(today, MATERIALIZE_WINDOW_DAYS - 1),
        exceptions: rule.exceptions.map(utcMidnightToDateKey),
    });
    if (keys.length === 0) return [];

    const result = await Task.bulkWrite(
        keys.map((key) => {
            const day = dateKeyToUtcMidnight(key);
            return {
                updateOne: {
                    filter: { userId: rule.userId, recurringTaskId: rule._id, occurrenceDate: day },
                    update: {
                        $setOnInsert: {
                            userId: rule.userId,
                            taskDescription: rule.title,
                            channel: rule.channel,
                            duration: rule.duration,
                            startTime: rule.startTime,
                            notes: rule.notes,
                            status: 'todo',
                            start: new Date(),
                            due: day,
                            recurringTaskId: rule._id,
                            occurrenceDate: day,
                            recurrenceDetached: false,
                            inBacklog: false,
                        },
                    },
                    upsert: true,
                },
            };
        }),
        { ordered: false }
    );

    return Object.values(result.upsertedIds).map(String);
}

/**
 * Deletes future, not done, not detached occurrences. Used by series edits and "stop repeating".
 * Returns the Google Calendar event ids of the deleted tasks, so the caller can remove them too.
 */
export async function deleteFutureOccurrences(
    rule: HydratedDocument<IRecurringTask>,
    timeZone: string
): Promise<string[]> {
    const today = localDateKey(new Date(), timeZone);
    const filter = {
        userId: rule.userId,
        recurringTaskId: rule._id,
        occurrenceDate: { $gte: dateKeyToUtcMidnight(today) },
        status: { $ne: 'done' },
        recurrenceDetached: { $ne: true },
    };

    const doomed = await Task.find(filter).select('calendarEventId').lean();
    await Task.deleteMany(filter);

    return doomed
        .map((task) => task.calendarEventId)
        .filter((eventId): eventId is string => Boolean(eventId));
}
