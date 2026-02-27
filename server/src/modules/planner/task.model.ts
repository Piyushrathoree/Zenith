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
});

export const Task = model<ITask>('Task', taskSchema);
