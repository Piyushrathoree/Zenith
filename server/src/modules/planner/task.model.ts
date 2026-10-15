import { Schema, Document, model, Types } from 'mongoose';

// ─── Task ──────────────────────────────────────────────────────────────────────
// A task belongs to a user and lives inside a channel (project).
// Status drives the Kanban board columns.

export interface ITask extends Document {
    taskDescription: string;
    userId: Types.ObjectId;
    channel: string;    // groups tasks into projects — indexed for fast filtering
    start?: Date;
    due?: Date;
    status: 'todo' | 'not_started' | 'in_progress' | 'done';
    notes?: string;
    duration?: string;   // planned duration, e.g. "1:00" — kept as a string to match the client
    startTime?: string;  // optional "HH:mm" time of day the task is scheduled to start
    subtasks: { id: string; title: string; completed: boolean }[];
    // Provenance: records where a task originated when it was created from an integration.
    source?: 'github' | 'gmail' | 'notion';
    externalId?: string;
    link?: string;
    // Backlog: a task with no board day (Phase 2).
    inBacklog: boolean;
    backloggedAt?: Date;
    backlogReason?: 'manual' | 'auto';
    // Recurring: set on tasks generated from a RecurringTask template (Phase 3).
    recurringTaskId?: Types.ObjectId;
    occurrenceDate?: Date;
    recurrenceDetached: boolean; // true once this one occurrence is edited, so series edits skip it
    // Rollover (Phase 5): how often this task was carried over unfinished, and when.
    skipCount: number;
    lastSkippedAt?: Date;
    // The day a task had when the weekly rollover moved it to the backlog. Keeps last week's stats honest.
    backlogFromDue?: Date;
    // Google Calendar mirror (Phase 6). Set only by the calendar worker.
    calendarEventId?: string;
    calendarSyncedAt?: Date;
}

const taskSchema = new Schema<ITask>({
    taskDescription: { type: String },
    userId: { type: Schema.Types.ObjectId, required: true },
    channel: { type: String, required: true, index: true },
    status: {
        type: String,
        enum: ['todo', 'not_started', 'in_progress', 'done'],
        default: 'todo',
    },
    start: { type: Date },
    due: { type: Date },
    notes: { type: String },
    duration: { type: String },
    startTime: { type: String },
    subtasks: {
        type: [{
            _id: false,
            id: { type: String, required: true },
            title: { type: String, required: true },
            completed: { type: Boolean, default: false },
        }],
        default: [],
    },
    // Provenance: records where a task originated when it was created from an integration.
    source: { type: String, enum: ['github', 'gmail', 'notion'] },
    externalId: { type: String },
    link: { type: String },
    // Backlog: a task with no board day (Phase 2).
    inBacklog: { type: Boolean, default: false },
    backloggedAt: { type: Date },
    backlogReason: { type: String, enum: ['manual', 'auto'] },
    // Recurring: set on tasks generated from a RecurringTask template (Phase 3).
    recurringTaskId: { type: Schema.Types.ObjectId },
    occurrenceDate: { type: Date },
    recurrenceDetached: { type: Boolean, default: false },
    // Rollover (Phase 5)
    skipCount: { type: Number, default: 0 },
    lastSkippedAt: { type: Date },
    backlogFromDue: { type: Date },
    // Google Calendar mirror (Phase 6)
    calendarEventId: { type: String },
    calendarSyncedAt: { type: Date },
});

// Every board, backlog and rollover query filters by user, usually with a date.
taskSchema.index({ userId: 1, due: 1 });
taskSchema.index({ userId: 1, inBacklog: 1 });
// One task per integration item, so the same GitHub issue or email is never planned twice.
taskSchema.index(
    { userId: 1, source: 1, externalId: 1 },
    { unique: true, partialFilterExpression: { source: { $type: 'string' }, externalId: { $type: 'string' } } }
);
// One task per template per day. This is what makes materializing idempotent.
taskSchema.index(
    { recurringTaskId: 1, occurrenceDate: 1 },
    { unique: true, partialFilterExpression: { recurringTaskId: { $exists: true } } }
);

export const Task = model<ITask>('Task', taskSchema);
