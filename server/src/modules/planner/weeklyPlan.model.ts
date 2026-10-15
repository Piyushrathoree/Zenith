import { Document, Schema, Types, model } from 'mongoose';

// ─── WeeklyPlan ────────────────────────────────────────────────────────────────
// One document per user per week. weekStart is UTC midnight of the week's first
// day (see "Date and time model" in docs/ROADMAP.md).

export interface IWeeklyGoal {
    id: string;
    title: string;
    progress: number;
    target: number;
}

export interface IWeeklyPlan extends Document {
    userId: Types.ObjectId;
    weekStart: Date;
    goals: IWeeklyGoal[];
    priorities: string[];
    reviewNotes: string;
    // Weekly review answers to the three prompts (Phase 8)
    reflection: { wentWell: string; didnt: string; change: string };
    planningCompletedAt?: Date;
    reviewCompletedAt?: Date;
}

const weeklyPlanSchema = new Schema<IWeeklyPlan>({
    userId: { type: Schema.Types.ObjectId, required: true },
    weekStart: { type: Date, required: true },
    goals: {
        type: [{
            _id: false,
            id: { type: String, required: true },
            title: { type: String, required: true },
            progress: { type: Number, default: 0 },
            target: { type: Number, default: 7 },
        }],
        default: [],
    },
    priorities: { type: [String], default: [] },
    reviewNotes: { type: String, default: '' },
    reflection: {
        wentWell: { type: String, default: '' },
        didnt: { type: String, default: '' },
        change: { type: String, default: '' },
    },
    planningCompletedAt: { type: Date },
    reviewCompletedAt: { type: Date },
}, { timestamps: true });

weeklyPlanSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

export const WeeklyPlan = model<IWeeklyPlan>('WeeklyPlan', weeklyPlanSchema);
