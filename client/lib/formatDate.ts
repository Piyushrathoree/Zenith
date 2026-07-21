import { format, formatDistanceToNow } from "date-fns";

// Dates rendered on integration cards come straight from third party provider
// APIs (GitHub, Gmail, Notion) and cannot be trusted: a field can be missing,
// empty, or malformed by the time it reaches the client. date-fns v4 throws
// RangeError: Invalid time value for an invalid Date, and there is no error
// boundary above the dashboard route, so one unguarded format() or
// formatDistanceToNow() call on a bad date blanks the entire page. These
// helpers validate the input before ever handing it to date-fns and always
// fall back to a quiet placeholder instead of throwing, even if a future
// date-fns release changes how it reacts to invalid dates.

const DEFAULT_FALLBACK = "recently";

type DateInput = string | number | Date | null | undefined;

function toValidDate(value: DateInput): Date | null {
    if (value === null || value === undefined || value === "") {
        return null;
    }
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Drop in replacement for date-fns `formatDistanceToNow` that never throws.
 * Returns `fallback` when `value` is missing, empty, or does not parse to a
 * valid date, or if date-fns itself throws while formatting.
 */
export function safeFormatDistanceToNow(
    value: DateInput,
    options?: { addSuffix?: boolean; includeSeconds?: boolean },
    fallback: string = DEFAULT_FALLBACK
): string {
    const date = toValidDate(value);
    if (!date) {
        return fallback;
    }
    try {
        return formatDistanceToNow(date, options);
    } catch {
        return fallback;
    }
}

/**
 * Drop in replacement for date-fns `format` that never throws. Returns
 * `fallback` when `value` is missing, empty, or does not parse to a valid
 * date, or if date-fns itself throws while formatting.
 */
export function safeFormat(
    value: DateInput,
    pattern: string,
    fallback: string = DEFAULT_FALLBACK
): string {
    const date = toValidDate(value);
    if (!date) {
        return fallback;
    }
    try {
        return format(date, pattern);
    } catch {
        return fallback;
    }
}
