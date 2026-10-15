import { z } from 'zod';

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be yyyy-MM-dd');

export const CreateRecurringSchema = z.object({
    title: z.string().trim().min(1).max(500),
    channel: z.enum(['work', 'personal', 'health']),
    duration: z.string().regex(/^\d+:\d{2}$/).default('0:30'),
    startTime: z.string().default(''), // normalised in the controller
    notes: z.string().max(5000).optional(),
    rrule: z.string().min(1),
    startsOn: dateKey,
    endsOn: dateKey.optional(),
});

// endsOn can be cleared with null when the user switches a series back to "no end".
export const UpdateRecurringSchema = CreateRecurringSchema.partial().extend({
    endsOn: dateKey.nullable().optional(),
});
