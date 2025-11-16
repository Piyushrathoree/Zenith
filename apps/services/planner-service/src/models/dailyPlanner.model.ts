import { Document, Schema, Types, model } from "mongoose";

export interface IDailyPlannerModel extends Document {
    date: Date;
    userId: Types.ObjectId;
    tasks: Types.ObjectId[];
    notes: string;
}

const dailyPlannerSchema = new Schema<IDailyPlannerModel>({
    date: { type: Date, required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    tasks: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    notes: { type: String },
});

export const DailyPlanner = model<IDailyPlannerModel>(
    "DailyPlanner",
    dailyPlannerSchema
);
