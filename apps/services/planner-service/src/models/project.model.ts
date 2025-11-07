import { Document, Schema, model, Types } from "mongoose";

export interface IProjectModel extends Document {
    name: string
    userId: Types.ObjectId // reference to user can be populated
}

const projectSchema = new Schema<IProjectModel>({
    name: { type: String, required: true },

    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true
    }
})

export const Project = model<IProjectModel>("Project", projectSchema);