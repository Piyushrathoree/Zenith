import { Document, Schema, model, Types } from 'mongoose';

// ─── Channel (Project) ────────────────────────────────────────────────────────
// A channel is a project-like grouping for tasks.
// Each user has their own channels — they act as workspaces.

export interface IChannel extends Document {
    name: string;
    userId: Types.ObjectId;
    channelDescription?: string;
}

const channelSchema = new Schema<IChannel>({
    name: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    channelDescription: { type: String },
});

export const Channel = model<IChannel>('Channel', channelSchema);
