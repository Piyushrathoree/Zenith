import type { Request, Response } from 'express';
import { env } from '../../config/env.ts';
import { encryptData, decryptData } from '../../utils/crypto.ts';
import { ApiResponse } from '../../utils/ApiResponse.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { verifyAndClaimOAuthState, mintOAuthState } from '../../utils/oauthState.ts';
import { Task } from '../planner/task.model.ts';
import { CalendarConnection } from './calendar.model.ts';
import {
    buildCalendarConsentUrl,
    createZenithCalendar,
    deleteCalendar,
    exchangeCode,
    revokeToken,
} from './calendar.google.ts';
import { getCalendarAccessToken } from './calendar.token.ts';
import { queueCalendarResync } from './calendar.queue.ts';
import User from '../auth/auth.model.ts';

const PURPOSE = 'google-calendar';

/** Is the caller connected, and is the connection still good? */
export const getCalendarStatus = async (req: Request, res: Response): Promise<void> => {
    const connection = await CalendarConnection.findOne({ userId: req.userId })
        .select('status lastSyncedAt lastError lastErrorAt');
    res.status(200).json(new ApiResponse(200, {
        connected: Boolean(connection),
        status: connection?.status ?? null,
        lastSyncedAt: connection?.lastSyncedAt ? connection.lastSyncedAt.toISOString() : null,
        lastError: connection?.lastError ?? null,
        lastErrorAt: connection?.lastErrorAt ? connection.lastErrorAt.toISOString() : null,
    }, 'Calendar status fetched'));
};

/** Step 1 of connecting. The client fetches this URL with its bearer token, then navigates to it. */
export const getCalendarConnectUrl = (req: Request, res: Response): void => {
    const state = mintOAuthState(req.userId!, PURPOSE);
    res.status(200).json(new ApiResponse(200, { url: buildCalendarConsentUrl(state) }, 'Connect URL generated'));
};

/**
 * Step 2 of connecting. Google redirects the browser here, so there is no bearer token.
 * Identity comes from the encrypted, single use `state`. Always ends with a redirect to Settings.
 */
export const calendarCallback = async (req: Request, res: Response): Promise<void> => {
    const fail = (reason: string) => res.redirect(`${env.FRONTEND_URL}/settings?calendar=error&reason=${reason}`);

    if (req.query.error) return fail('denied'); // the user pressed Cancel on Google's screen

    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    if (!code || !state) return fail('invalid_state');

    const check = await verifyAndClaimOAuthState(state, PURPOSE);
    if (!check.ok) return fail(check.reason);

    let tokens;
    try {
        tokens = await exchangeCode(code);
    } catch {
        return fail('token_exchange_failed');
    }
    // Without a refresh token we could not renew access later, so the connection would die in an hour.
    if (!tokens.refresh_token) return fail('no_refresh_token');

    try {
        const user = await User.findById(check.userId).select('timezone').lean();
        const existing = await CalendarConnection.findOne({ userId: check.userId });
        const calendarId = existing?.calendarId
            ?? (await createZenithCalendar(tokens.access_token, user?.timezone || 'UTC'))!.id;

        // A reconnect clears the previous failure so the reconnect prompt goes away at once.
        await CalendarConnection.findOneAndUpdate(
            { userId: check.userId },
            {
                $set: {
                    userId: check.userId,
                    accessToken: encryptData(tokens.access_token, env.ENCRYPTION_KEY),
                    refreshToken: encryptData(tokens.refresh_token, env.ENCRYPTION_KEY),
                    expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
                    calendarId,
                    status: 'active',
                },
                $unset: { lastError: '', lastErrorAt: '' },
            },
            { upsert: true, new: true }
        );

        await queueCalendarResync(check.userId);
        res.redirect(`${env.FRONTEND_URL}/settings?calendar=connected`);
    } catch (error) {
        console.error('[Calendar] callback failed:', error);
        fail('server_error');
    }
};

/**
 * Disconnects: removes the Zenith calendar (and every event in it) from the user's Google account,
 * revokes our access, and forgets the stored tokens. Each Google step is best effort, so a Google
 * outage still lets the user disconnect in Zenith.
 */
export const disconnectCalendar = async (req: Request, res: Response): Promise<void> => {
    const connection = await CalendarConnection.findOne({ userId: req.userId });
    if (!connection) {
        res.status(404).json(new ApiError(404, 'No Google Calendar is connected'));
        return;
    }

    try {
        const token = await getCalendarAccessToken(connection);
        await deleteCalendar(token, connection.calendarId);
    } catch (error) {
        console.warn('[Calendar] could not delete the Zenith calendar on disconnect:', error);
    }

    const refreshToken = decryptData(connection.refreshToken, env.ENCRYPTION_KEY);
    if (refreshToken) await revokeToken(refreshToken);

    await Task.updateMany(
        { userId: req.userId },
        { $unset: { calendarEventId: '', calendarSyncedAt: '' } }
    );
    await CalendarConnection.deleteOne({ _id: connection._id });

    res.status(200).json(new ApiResponse(200, null, 'Google Calendar disconnected'));
};
