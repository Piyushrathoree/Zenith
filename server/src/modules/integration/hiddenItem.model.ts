import { Document, Schema, model } from 'mongoose';

// ─── HiddenItem ───────────────────────────────────────────────────────────────
// An integration item the user hid from the panel (Phase 13). With `until` it is snoozed and comes
// back after that time; without it, it stays hidden. Filtered out when items are returned.

export interface IHiddenItem extends Document {
    userId: string; // string, like Integration.userId
    provider: 'github' | 'gmail' | 'notion';
    externalId: string;
    until?: Date;
}

const hiddenItemSchema = new Schema<IHiddenItem>({
    userId: { type: String, required: true },
    provider: { type: String, enum: ['github', 'gmail', 'notion'], required: true },
    externalId: { type: String, required: true },
    until: { type: Date },
}, { timestamps: true });

hiddenItemSchema.index({ userId: 1, provider: 1, externalId: 1 }, { unique: true });

export const HiddenItem = model<IHiddenItem>('HiddenItem', hiddenItemSchema);

/** "provider:externalId" keys the user currently has hidden (permanent, or snoozed until later). */
export async function activeHiddenKeys(userId: string): Promise<Set<string>> {
    const rows = await HiddenItem.find({
        userId,
        $or: [{ until: { $exists: false } }, { until: null }, { until: { $gt: new Date() } }],
    }).select('provider externalId').lean();
    return new Set(rows.map((row) => `${row.provider}:${row.externalId}`));
}
