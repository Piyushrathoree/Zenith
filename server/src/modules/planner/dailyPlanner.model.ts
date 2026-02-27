import { Document, Schema, Types, model } from 'mongoose';

// ─── DailyPlanner ──────────────────────────────────────────────────────────────
// Links a specific date to a list of tasks for a user.
// Used for the "Today Panel" and "Daily Planner" views.
// Tasks array refs to the Task collection and is populated on read.

export interface IDailyPlanner extends Document {
    date: Date;
    userId: Types.ObjectId;
    tasks: Types.ObjectId[];
    notes?: string;
}

const dailyPlannerSchema = new Schema<IDailyPlanner>({
    date: { type: Date, required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    tasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    notes: { type: String },
});

// Ensure one planner per user per day
dailyPlannerSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailyPlanner = model<IDailyPlanner>('DailyPlanner', dailyPlannerSchema);
