import { randomUUID } from 'node:crypto';
import { encryptData, decryptData } from './crypto.ts';
import { env } from '../config/env.ts';
import { redisClient } from '../middleware/rateLimit.middleware.ts';

// Encrypted, expiring, single use OAuth state. The integration module has its own copy of this
// logic (integration.controller.ts). Calendar uses this shared helper so it does not duplicate it.

const STATE_TTL_MS = 10 * 60 * 1000;

/** Encrypted, expiring, single use OAuth state bound to a user and a purpose. */
export function mintOAuthState(userId: string, purpose: string): string {
    return encryptData(
        JSON.stringify({ u: userId, p: purpose, e: Date.now() + STATE_TTL_MS, n: randomUUID() }),
        env.ENCRYPTION_KEY
    );
}

export type OAuthStateCheck =
    | { ok: true; userId: string }
    | { ok: false; reason: 'invalid_state' | 'state_replayed' | 'server_error' };

/**
 * Verifies the state and claims its nonce so it works exactly once.
 * Fails CLOSED: if Redis is down we cannot rule out a replay, so the callback is rejected.
 */
export async function verifyAndClaimOAuthState(state: string, purpose: string): Promise<OAuthStateCheck> {
    let parsed: { u?: unknown; p?: unknown; e?: unknown; n?: unknown };
    try {
        const raw = decryptData(state, env.ENCRYPTION_KEY);
        if (!raw) return { ok: false, reason: 'invalid_state' };
        parsed = JSON.parse(raw);
    } catch {
        return { ok: false, reason: 'invalid_state' };
    }

    if (
        typeof parsed.u !== 'string' ||
        parsed.p !== purpose ||
        typeof parsed.n !== 'string' ||
        typeof parsed.e !== 'number' ||
        Date.now() > parsed.e
    ) {
        return { ok: false, reason: 'invalid_state' };
    }

    try {
        const claimed = await redisClient.set(`oauth:state:${parsed.n}`, '1', 'EX', STATE_TTL_MS / 1000, 'NX');
        if (!claimed) return { ok: false, reason: 'state_replayed' };
    } catch {
        return { ok: false, reason: 'server_error' };
    }

    return { ok: true, userId: parsed.u };
}
