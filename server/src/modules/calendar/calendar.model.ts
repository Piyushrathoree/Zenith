import { Document, Schema, Types, model } from 'mongoose';

// ─── CalendarConnection ────────────────────────────────────────────────────────
// One per user. Tokens are AES encrypted at rest (utils/crypto.ts), like Integration.

export interface ICalendarConnection extends Document {
    userId: Types.ObjectId;
    accessToken: string;    // encrypted
    refreshToken: string;   // encrypted
    expiresAt?: Date;
    calendarId: string;     // the "Zenith" secondary calendar in the user's Google account
    status: 'active' | 'revoked';
    // Connection health, the same codes as Integration.lastError.
    lastSyncedAt?: Date;
    lastError?: CalendarErrorCode;
    lastErrorAt?: Date;
}

export type CalendarErrorCode = 'needs_reconnect' | 'rate_limited' | 'provider_down';

const calendarConnectionSchema = new Schema<ICalendarConnection>({
    userId: { type: Schema.Types.ObjectId, required: true, unique: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresAt: { type: Date },
    calendarId: { type: String, required: true },
    status: { type: String, enum: ['active', 'revoked'], default: 'active' },
    lastSyncedAt: { type: Date },
    lastError: { type: String, enum: ['needs_reconnect', 'rate_limited', 'provider_down'] },
    lastErrorAt: { type: Date },
}, { timestamps: true });

export const CalendarConnection = model<ICalendarConnection>('CalendarConnection', calendarConnectionSchema);
