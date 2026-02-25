import { Schema, Document, model, Types } from "mongoose";

export interface ITaskModel extends Document {
    taskDescription: string;
    userId: Types.ObjectId;
    channel: string;
    start?: Date;
    due?: Date;
    status: "todo" | "not_started" | "in_progress" | "done";
    notes: string;
}

const taskSchema = new Schema<ITaskModel>({
    taskDescription: { type: String },
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    channel: {
        type: String,
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: ["todo", "in_progress", "done", "not_started"],
        default: "todo",
    },
    start: { type: Date },
    due: { type: Date },
    notes: { type: String },
});

export const Task = model<ITaskModel>("Task", taskSchema);
