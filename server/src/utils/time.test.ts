import { describe, expect, test } from 'bun:test';
import {
    addDaysToKey,
    localDateKey,
    localDateTime,
    minutesToDuration,
    normalizeStartTime,
    parseDurationToMinutes,
    weekStartKey,
} from './time.ts';

describe('localDateKey', () => {
    test('India is already on the next day at 19:00 UTC', () => {
        expect(localDateKey(new Date('2026-10-15T19:00:00Z'), 'Asia/Kolkata')).toBe('2026-10-16');
    });
    test('New York is still on the previous day at 02:00 UTC', () => {
        expect(localDateKey(new Date('2026-10-15T02:00:00Z'), 'America/New_York')).toBe('2026-10-14');
    });
});

describe('weekStartKey', () => {
    // 2026-10-15 is a Thursday
    test('Monday start', () => expect(weekStartKey('2026-10-15', 1)).toBe('2026-10-12'));
    test('Sunday start', () => expect(weekStartKey('2026-10-15', 0)).toBe('2026-10-11'));
    test('a Monday is its own week start', () => expect(weekStartKey('2026-10-12', 1)).toBe('2026-10-12'));
    test('a Sunday with Monday start belongs to the previous week', () =>
        expect(weekStartKey('2026-10-18', 1)).toBe('2026-10-12'));
});

describe('normalizeStartTime', () => {
    test.each([
        ['7:00 am', '07:00'],
        ['12:00 pm', '12:00'],
        ['12:30 am', '00:30'],
        ['8:00 PM', '20:00'],
        ['9:05', '09:05'],
        ['23:59', '23:59'],
        ['', ''],
    ])('%s -> %s', (input, expected) => expect(normalizeStartTime(input)).toBe(expected));
    test.each(['25:00', '7:61', '13:00 pm', 'noon'])('%s is rejected', (input) =>
        expect(normalizeStartTime(input)).toBeNull());
});

describe('durations and date math', () => {
    test('parse', () => expect(parseDurationToMinutes('1:30')).toBe(90));
    test('parse fallback', () => expect(parseDurationToMinutes('abc', 45)).toBe(45));
    test('format', () => expect(minutesToDuration(135)).toBe('2:15'));
    test('add days across a month', () => expect(addDaysToKey('2026-10-31', 1)).toBe('2026-11-01'));
    test('local date time crosses midnight', () =>
        expect(localDateTime('2026-10-15', '23:30', 60)).toBe('2026-10-16T00:30:00'));
});
