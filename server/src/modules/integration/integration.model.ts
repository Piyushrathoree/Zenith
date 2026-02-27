import { Schema, model } from 'mongoose';

// ─── Integration ──────────────────────────────────────────────────────────────
// Stores OAuth tokens for third-party integrations.
// Tokens are encrypted at rest using AES-256 (see src/utils/crypto.ts).
// Each user can have one integration per provider.

type Provider = 'github' | 'gmail' | 'notion';

interface IIntegration {
    userId: string;
    provider: Provider;
    accessToken: string;    // AES-256 encrypted
    refreshToken: string;   // AES-256 encrypted
    profile: {
        username: string;
        avatar: string;
    };
    expiresAt?: Date;
    status: 'active' | 'expired' | 'revoked';
}

const integrationSchema = new Schema<IIntegration>({
    userId: { type: String, required: true },
    provider: { type: String, enum: ['github', 'gmail', 'notion'], required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    profile: {
        username: { type: String, required: true },
        avatar: { type: String, required: true },
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
