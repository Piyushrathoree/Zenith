import { Schema, Document, model, Types } from "mongoose";

export interface ITaskModel extends Document {
    title: string,
    userId: Types.ObjectId,
    projectId: Types.ObjectId
    start?: Date,
    due?: Date,
    status: "todo" | "not started" | "In progress" | "done",
    notes : string
}

const taskSchema = new Schema <ITaskModel>({
    title:{type:String },
    userId: Schema.Types.ObjectId,
    projectId:Schema.Types.ObjectId,
        
})