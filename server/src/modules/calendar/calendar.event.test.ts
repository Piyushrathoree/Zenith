import { describe, expect, test } from 'bun:test';
import { buildEventBody, shouldHaveEvent } from './calendar.event.ts';

const base = {
    _id: 'task-1',
    taskDescription: 'Write report',
    status: 'todo',
    due: new Date('2026-10-15T00:00:00.000Z'),
    startTime: '09:30',
    duration: '1:30',
};

const options = { timeZone: 'Asia/Kolkata', reminderMinutes: 10, frontendUrl: 'http://localhost:3000' };

describe('buildEventBody', () => {
    test('basic timed task', () => {
        const body = buildEventBody(base, options);
        expect(body.start).toEqual({ dateTime: '2026-10-15T09:30:00', timeZone: 'Asia/Kolkata' });
        expect(body.end).toEqual({ dateTime: '2026-10-15T11:00:00', timeZone: 'Asia/Kolkata' });
        expect(body.reminders).toEqual({
            useDefault: false,
            overrides: [{ method: 'popup', minutes: 10 }],
        });
    });

    test('a task that runs past midnight ends on the next day', () => {
        const body = buildEventBody({ ...base, startTime: '23:30', duration: '1:00' }, options);
        expect(body.end.dateTime).toBe('2026-10-16T00:30:00');
    });

    test('a done task gets a check mark in the title', () => {
        const body = buildEventBody({ ...base, status: 'done' }, options);
        expect(body.summary.startsWith('✓ ')).toBe(true);
    });

    test('a zero reminder means no popup override', () => {
        const body = buildEventBody(base, { ...options, reminderMinutes: 0 });
        expect(body.reminders.overrides).toEqual([]);
    });
});

describe('shouldHaveEvent', () => {
    test('a task with a day and a time gets an event', () => {
        expect(shouldHaveEvent(base)).toBe(true);
    });

    test('no time, no day, or in the backlog means no event', () => {
        expect(shouldHaveEvent({ ...base, startTime: '' })).toBe(false);
        expect(shouldHaveEvent({ ...base, due: undefined })).toBe(false);
        expect(shouldHaveEvent({ ...base, inBacklog: true })).toBe(false);
        expect(shouldHaveEvent(null)).toBe(false);
    });
});
