import { describe, expect, test } from 'bun:test';
import { computeWeeklyStats } from './weeklyStats.ts';

describe('computeWeeklyStats', () => {
    test('an empty week is all zeros', () => {
        expect(computeWeeklyStats('2026-10-12', [])).toEqual({
            weekStart: '2026-10-12',
            plannedCount: 0,
            doneCount: 0,
            plannedMinutes: 0,
            doneMinutes: 0,
        });
    });

    test('counts done and planned tasks and their minutes', () => {
        const stats = computeWeeklyStats('2026-10-12', [
            { status: 'done', duration: '1:00' },
            { status: 'todo', duration: '0:30' },
            { status: 'in_progress', duration: '2:00' },
        ]);
        expect(stats.plannedCount).toBe(3);
        expect(stats.doneCount).toBe(1);
        expect(stats.plannedMinutes).toBe(60 + 30 + 120);
        expect(stats.doneMinutes).toBe(60);
    });

    test('a task without a duration counts as 60 minutes', () => {
        const stats = computeWeeklyStats('2026-10-12', [{ status: 'done' }]);
        expect(stats.plannedMinutes).toBe(60);
        expect(stats.doneMinutes).toBe(60);
    });
});
