import { Document, Schema, Types, model } from 'mongoose';

// ─── RecurringTask ─────────────────────────────────────────────────────────────
// Template for a repeating task. Real Task documents are generated from it by
// materializeRule() in recurrence.ts. See docs/roadmap/phase-3-recurring-tasks.md.

export interface IRecurringTask extends Document {
    userId: Types.ObjectId;
    title: string;
    channel: string;        // work | personal | health
    duration: string;       // "H:mm", same as Task.duration
    startTime: string;      // "HH:mm" or ""
    notes?: string;
    rrule: string;          // e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR" (no DTSTART, no TZID)
    startsOn: Date;         // UTC midnight of the first possible day
    endsOn?: Date;          // UTC midnight of the last possible day
    exceptions: Date[];     // occurrence days the user deleted, never regenerate these
    active: boolean;
}

const recurringTaskSchema = new Schema<IRecurringTask>({
    userId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    channel: { type: String, required: true },
    duration: { type: String, default: '0:30' },
    startTime: { type: String, default: '' },
    notes: { type: String },
    rrule: { type: String, required: true },
    startsOn: { type: Date, required: true },
    endsOn: { type: Date },
    exceptions: { type: [Date], default: [] },
    active: { type: Boolean, default: true },
}, { timestamps: true });

recurringTaskSchema.index({ userId: 1, active: 1 });

export const RecurringTask = model<IRecurringTask>('RecurringTask', recurringTaskSchema);
