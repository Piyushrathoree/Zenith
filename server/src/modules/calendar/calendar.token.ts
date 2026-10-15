import type { HydratedDocument } from 'mongoose';
import { decryptData, encryptData } from '../../utils/crypto.ts';
import { env } from '../../config/env.ts';
import type { ICalendarConnection } from './calendar.model.ts';
import { GoogleAuthError, refreshAccessToken } from './calendar.google.ts';

// Refresh a minute early, the same idea as integration token.service.ts.
const EXPIRY_SKEW_MS = 60 * 1000;

/** Google rejected our refresh token (invalid_grant, 400 or 401): the user must reconnect. */
export async function markCalendarRevoked(connection: HydratedDocument<ICalendarConnection>): Promise<void> {
    connection.status = 'revoked';
    connection.lastError = 'needs_reconnect';
    connection.lastErrorAt = new Date();
    await connection.save();
}

/** A valid access token, refreshing it first when it is about to expire. */
export async function getCalendarAccessToken(connection: HydratedDocument<ICalendarConnection>): Promise<string> {
    if (connection.expiresAt && connection.expiresAt.getTime() - EXPIRY_SKEW_MS > Date.now()) {
        return decryptData(connection.accessToken, env.ENCRYPTION_KEY);
    }

    const refreshToken = decryptData(connection.refreshToken, env.ENCRYPTION_KEY);
    if (!refreshToken) {
        await markCalendarRevoked(connection);
        throw new GoogleAuthError('No refresh token stored');
    }

    try {
        const data = await refreshAccessToken(refreshToken);
        connection.accessToken = encryptData(data.access_token, env.ENCRYPTION_KEY);
        connection.expiresAt = new Date(Date.now() + data.expires_in * 1000);
        await connection.save();
        return data.access_token;
    } catch (error) {
        if (error instanceof GoogleAuthError) await markCalendarRevoked(connection);
        throw error;
    }
}
