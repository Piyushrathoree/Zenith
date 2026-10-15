import { describe, expect, test } from 'bun:test';
import { expandOccurrences, validateRule } from './recurrence.ts';

describe('expandOccurrences', () => {
    test('weekly on Mon, Wed, Fri', () => {
        expect(expandOccurrences({
            rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
            startsOn: '2026-10-12',
            from: '2026-10-12',
            to: '2026-10-18',
            exceptions: [],
        })).toEqual(['2026-10-12', '2026-10-14', '2026-10-16']);
    });

    test('daily with an exception skips that day', () => {
        expect(expandOccurrences({
            rrule: 'FREQ=DAILY',
            startsOn: '2026-10-12',
            from: '2026-10-12',
            to: '2026-10-14',
            exceptions: ['2026-10-13'],
        })).toEqual(['2026-10-12', '2026-10-14']);
    });

    test('a rule that starts in the future only produces days from its start', () => {
        expect(expandOccurrences({
            rrule: 'FREQ=DAILY',
            startsOn: '2026-10-20',
            from: '2026-10-12',
            to: '2026-10-21',
            exceptions: [],
        })).toEqual(['2026-10-20', '2026-10-21']);
    });

    test('endsOn stops the series', () => {
        expect(expandOccurrences({
            rrule: 'FREQ=DAILY',
            startsOn: '2026-10-12',
            endsOn: '2026-10-13',
            from: '2026-10-12',
            to: '2026-10-20',
            exceptions: [],
        })).toEqual(['2026-10-12', '2026-10-13']);
    });

    test('monthly on the 15th', () => {
        expect(expandOccurrences({
            rrule: 'FREQ=MONTHLY;BYMONTHDAY=15',
            startsOn: '2026-10-01',
            from: '2026-10-01',
            to: '2026-11-30',
            exceptions: [],
        })).toEqual(['2026-10-15', '2026-11-15']);
    });

    test('an empty window returns nothing', () => {
        expect(expandOccurrences({
            rrule: 'FREQ=DAILY',
            startsOn: '2026-10-12',
            from: '2026-10-14',
            to: '2026-10-13',
            exceptions: [],
        })).toEqual([]);
    });
});

describe('validateRule', () => {
    test.each([
        'FREQ=HOURLY',
        'DTSTART:20261012T000000Z\nFREQ=DAILY',
        'garbage',
    ])('rejects %s', (rule) => expect(validateRule(rule)).not.toBeNull());

    test('accepts a weekly rule', () => expect(validateRule('FREQ=WEEKLY;BYDAY=MO')).toBeNull());
});
