import { describe, expect, test } from 'bun:test';
import { summarizeDay, summarizeWeek } from './rituals.ts';

const d = (key: string) => new Date(`${key}T00:00:00.000Z`);

describe('summarizeDay', () => {
    test('counts, minutes, and carried over tasks', () => {
        const s = summarizeDay([
            { _id: 'a', status: 'done', duration: '1:00' },
            { _id: 'b', status: 'todo', duration: '0:30', skipCount: 2 },
            { _id: 'c', status: 'todo' },
        ]);
        expect(s.plannedCount).toBe(3);
        expect(s.plannedMinutes).toBe(150);
        expect(s.doneCount).toBe(1);
        expect(s.carriedOver.map((t) => t._id)).toEqual(['b']);
    });
});

describe('summarizeWeek', () => {
    // Week of Mon 2026-10-12, today is Thu 2026-10-15
    const tasks = [
        { _id: 'done-mon', status: 'done', due: d('2026-10-12'), duration: '1:00' },
        { _id: 'open-tue', status: 'todo', due: d('2026-10-13'), duration: '0:30' },
        { _id: 'open-fri', status: 'todo', due: d('2026-10-16'), duration: '2:00' },
        { _id: 'backlogged', status: 'todo', inBacklog: true, backlogFromDue: d('2026-10-14') },
        { _id: 'old-backlog', status: 'todo', inBacklog: true, backlogFromDue: d('2026-10-01') },
        { _id: 'next-week', status: 'todo', due: d('2026-10-20') },
    ];
    const s = summarizeWeek(tasks, '2026-10-12', '2026-10-15');

    test('seven days with per day totals', () => {
        expect(s.days.map((day) => day.date)).toEqual([
            '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18',
        ]);
        expect(s.days[0]).toEqual({ date: '2026-10-12', plannedCount: 1, plannedMinutes: 60, doneCount: 1 });
        expect(s.days[4].plannedMinutes).toBe(120);
    });

    test('done and slipped', () => {
        expect(s.done.map((t) => t._id)).toEqual(['done-mon']);
        expect(s.slipped.map((t) => t._id).sort()).toEqual(['backlogged', 'open-tue']);
    });
});
