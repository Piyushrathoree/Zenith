import { Schema, Document, model, Types } from "mongoose";

export interface ITaskModel extends Document {
    title: string,
    userId: Types.ObjectId,
    projectId: Types.ObjectId
    start?: Date,
    due?: Date,
    status: "todo" | "not_started" | "in_progress" | "done",
    notes: string
}

const taskSchema = new Schema<ITaskModel>({
    title: { type: String },
    userId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    projectId:
    {
        type: Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['todo', 'in_progress', 'done', 'not_started'],
        default: 'todo'
    },
    start: { type: Date },
    due: { type: Date },
    notes: { type: String }
})

export const Task = model<ITaskModel>("Task", taskSchema);