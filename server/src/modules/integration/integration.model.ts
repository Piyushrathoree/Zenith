import { Document, Schema, model } from 'mongoose';

// ─── Integration ──────────────────────────────────────────────────────────────
// Stores OAuth tokens for third-party integrations.
// Tokens are encrypted at rest using AES-256 (see src/utils/crypto.ts).
// Each user can have one integration per provider.

export type Provider = 'github' | 'gmail' | 'notion';

export interface IIntegration extends Document {
    userId: string;
    provider: Provider;
    accessToken: string;    // AES-256 encrypted
    refreshToken: string;   // AES-256 encrypted, empty for providers that never issue one
    profile: {
        username: string;
        avatar: string;
    };
    expiresAt?: Date;
    status: 'active' | 'expired' | 'revoked';
}

const integrationSchema = new Schema<IIntegration>({
    // req.userId is already a string on the auth middleware, so this stays a
    // String rather than an ObjectId to match how the rest of this module reads it.
    userId: { type: String, required: true },
    provider: { type: String, enum: ['github', 'gmail', 'notion'], required: true },
    accessToken: { type: String, required: true },
    // GitHub and Notion never return a refresh token, so this cannot be required.
    refreshToken: { type: String, required: false, default: '' },
    profile: {
        username: { type: String, required: true, default: '' },
        avatar: { type: String, required: true, default: '' },
    },
    expiresAt: { type: Date },
    status: {
        type: String,
        enum: ['active', 'expired', 'revoked'],
        default: 'active',
    },
}, { timestamps: true });

// One integration per user per provider
integrationSchema.index({ userId: 1, provider: 1 }, { unique: true });

export const Integration = model<IIntegration>('Integration', integrationSchema);
