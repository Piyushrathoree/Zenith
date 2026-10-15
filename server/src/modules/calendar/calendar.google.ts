import { env } from '../../config/env.ts';

// Plain fetch, no googleapis package. Matches the integration adapters.

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const API_BASE = 'https://www.googleapis.com/calendar/v3';

// Only lets Zenith see and change calendars it created itself, never the user's own calendars.
export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.app.created';

/** Google no longer accepts our tokens (revoked, expired refresh token). Do not retry. */
export class GoogleAuthError extends Error {}

/** Any other non 2xx response. `status` lets callers treat 404/410 specially. */
export class GoogleApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

/** Must match the redirect URI registered in the Google Cloud console, byte for byte. */
export function calendarRedirectUri(): string {
    return `${env.API_BASE_URL}/api/v1/calendar/callback`;
}

export function buildCalendarConsentUrl(state: string): string {
    const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: calendarRedirectUri(),
        response_type: 'code',
        scope: CALENDAR_SCOPE,
        access_type: 'offline', // we need a refresh token
        prompt: 'consent',      // forces Google to return the refresh token every time
        state,
    });
    return `${AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
}

async function postForm(url: string, form: Record<string, string>): Promise<Response> {
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(form),
    });
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
    const res = await postForm(TOKEN_URL, {
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: calendarRedirectUri(),
        grant_type: 'authorization_code',
    });
    if (!res.ok) throw new GoogleApiError(res.status, `Token exchange failed: ${res.status}`);
    return (await res.json()) as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const res = await postForm(TOKEN_URL, {
        refresh_token: refreshToken,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
    });
    if (res.status === 400 || res.status === 401) throw new GoogleAuthError(`Refresh rejected: ${res.status}`);
    if (!res.ok) throw new GoogleApiError(res.status, `Refresh failed: ${res.status}`);
    return (await res.json()) as TokenResponse;
}

export async function revokeToken(token: string): Promise<void> {
    await postForm(REVOKE_URL, { token }).catch(() => undefined); // best effort
}

async function call<T>(accessToken: string, method: string, path: string, body?: unknown): Promise<T | null> {
    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    if (res.status === 401) throw new GoogleAuthError('Access token rejected');
    if (!res.ok) throw new GoogleApiError(res.status, `Google Calendar ${method} ${path} failed: ${res.status}`);
    return (await res.json()) as T;
}

const enc = encodeURIComponent;

export const createZenithCalendar = (token: string, timeZone: string) =>
    call<{ id: string }>(token, 'POST', '/calendars', {
        summary: 'Zenith',
        description: 'Time boxed tasks from Zenith',
        timeZone,
    });

export const deleteCalendar = (token: string, calendarId: string) =>
    call<null>(token, 'DELETE', `/calendars/${enc(calendarId)}`);

export const insertEvent = (token: string, calendarId: string, event: unknown) =>
    call<{ id: string }>(token, 'POST', `/calendars/${enc(calendarId)}/events`, event);

export const patchEvent = (token: string, calendarId: string, eventId: string, event: unknown) =>
    call<{ id: string }>(token, 'PATCH', `/calendars/${enc(calendarId)}/events/${enc(eventId)}`, event);

/** Deleting an event that is already gone (404/410) counts as success. */
export async function deleteEvent(token: string, calendarId: string, eventId: string): Promise<void> {
    try {
        await call<null>(token, 'DELETE', `/calendars/${enc(calendarId)}/events/${enc(eventId)}`);
    } catch (error) {
        if (error instanceof GoogleApiError && (error.status === 404 || error.status === 410)) return;
        throw error;
    }
}
