import { Schema, model, Document } from "mongoose";

export interface IAuthUser extends Document {
    provider: "google" | "github";
    providerId: string;
    email?: string;
    name?: string;
    avatar?: string;
}

const authUserSchema = new Schema<IAuthUser>({
    provider: { type: String, required: true },
    providerId: { type: String, required: true, unique: true },
    email: { type: String },
    name: { type: String },
    avatar: { type: String },
});

export const AuthUser = model<IAuthUser>("AuthUser", authUserSchema);