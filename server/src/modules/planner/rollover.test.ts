import { describe, expect, test } from 'bun:test';
import { planRollover } from './rollover.ts';

// 2026-10-15 is a Thursday. With Monday as the week start, this week began on 2026-10-12.
const run = (localToday: string, weekStartsOn: 0 | 1, tasks: [string, string][]) =>
    planRollover({
        localToday,
        weekStartsOn,
        tasks: tasks.map(([id, dueKey]) => ({ id, dueKey })),
    });

describe('planRollover', () => {
    test('yesterday rolls to today', () => {
        expect(run('2026-10-15', 1, [['a', '2026-10-14']])).toEqual({ rollIds: ['a'], backlogIds: [] });
    });

    test('Monday of this week rolls', () => {
        expect(run('2026-10-15', 1, [['a', '2026-10-12']]).rollIds).toEqual(['a']);
    });

    test('last Sunday goes to the backlog when weeks start on Monday', () => {
        expect(run('2026-10-15', 1, [['a', '2026-10-11']]).backlogIds).toEqual(['a']);
    });

    test('last Sunday rolls when weeks start on Sunday', () => {
        expect(run('2026-10-15', 0, [['a', '2026-10-11']]).rollIds).toEqual(['a']);
    });

    test('today and future tasks are untouched', () => {
        expect(run('2026-10-15', 1, [['a', '2026-10-15'], ['b', '2026-10-20']])).toEqual({
            rollIds: [],
            backlogIds: [],
        });
    });

    test('the first day of a new week sends last week to the backlog', () => {
        expect(run('2026-10-19', 1, [['a', '2026-10-18'], ['b', '2026-10-13']])).toEqual({
            rollIds: [],
            backlogIds: ['a', 'b'],
        });
    });

    test('a mix of tasks from this week and earlier', () => {
        expect(run('2026-10-15', 1, [['a', '2026-10-13'], ['b', '2026-10-01'], ['c', '2026-10-16']])).toEqual({
            rollIds: ['a'],
            backlogIds: ['b'],
        });
    });
});
