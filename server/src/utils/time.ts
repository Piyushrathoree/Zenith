/**
 * Date and time helpers. See "Date and time model" in docs/ROADMAP.md.
 *
 * A DateKey is "yyyy-MM-dd" for a calendar day in the user's timezone.
 * A task's board day is stored in Task.due as UTC midnight of its DateKey.
 */

export type DateKey = string;

/** True when `timeZone` is an IANA name the runtime understands, e.g. "Asia/Kolkata". */
export function isValidTimeZone(timeZone: string): boolean {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone });
        return true;
    } catch {
        return false;
    }
}

/** The calendar day it currently is for someone in `timeZone`. */
export function localDateKey(now: Date, timeZone: string): DateKey {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(now);
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
}

export function isDateKey(value: unknown): value is DateKey {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function dateKeyToUtcMidnight(key: DateKey): Date {
    return new Date(`${key}T00:00:00.000Z`);
}

export function utcMidnightToDateKey(date: Date): DateKey {
    return date.toISOString().slice(0, 10);
}

export function addDaysToKey(key: DateKey, days: number): DateKey {
    const date = dateKeyToUtcMidnight(key);
    date.setUTCDate(date.getUTCDate() + days);
    return utcMidnightToDateKey(date);
}

/** First day of the week containing `key`. weekStartsOn: 0 = Sunday, 1 = Monday. */
export function weekStartKey(key: DateKey, weekStartsOn: 0 | 1): DateKey {
    const dayOfWeek = dateKeyToUtcMidnight(key).getUTCDay(); // 0 = Sunday
    const diff = (dayOfWeek - weekStartsOn + 7) % 7;
    return addDaysToKey(key, -diff);
}

/**
 * Normalises a time of day to 24h "HH:mm".
 * Accepts "14:05", "9:00", "7:00 am", "12:30 PM".
 * Returns "" for an empty input (meaning "no time") and null when unrecognisable.
 */
export function normalizeStartTime(raw: string): string | null {
    const value = raw.trim().toLowerCase();
    if (value === '') return '';
    const match = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/.exec(value);
    if (!match) return null;
    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const meridiem = match[3];
    if (minutes > 59) return null;
    if (meridiem) {
        if (hours < 1 || hours > 12) return null;
        if (meridiem === 'am' && hours === 12) hours = 0;
        if (meridiem === 'pm' && hours !== 12) hours += 12;
    } else if (hours > 23) {
        return null;
    }
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** "1:30" -> 90. Falls back when missing or malformed. */
export function parseDurationToMinutes(raw: string | undefined, fallback = 60): number {
    if (!raw) return fallback;
    const match = /^(\d+):(\d{2})$/.exec(raw.trim());
    if (!match) return fallback;
    return Number(match[1]) * 60 + Number(match[2]);
}

/** 90 -> "1:30" */
export function minutesToDuration(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Local wall clock date time without an offset, "yyyy-MM-ddTHH:mm:00".
 * Used together with an explicit timeZone field (Google Calendar, Phase 6).
 * Handles crossing midnight when addMinutes pushes past 24:00.
 */
export function localDateTime(key: DateKey, hhmm: string, addMinutes = 0): string {
    const base = new Date(`${key}T${hhmm}:00.000Z`);
    base.setUTCMinutes(base.getUTCMinutes() + addMinutes);
    return base.toISOString().slice(0, 19);
}
