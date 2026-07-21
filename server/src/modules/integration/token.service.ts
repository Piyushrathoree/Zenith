import type { HydratedDocument } from 'mongoose';
import { decryptData, encryptData } from '../../utils/crypto.ts';
import { env } from '../../config/env.ts';
import { OAUTH_CONFIG } from './oauth.config.ts';
import type { IIntegration } from './integration.model.ts';

// Refresh a token slightly before it actually expires so a request in flight
// never gets caught holding a token that dies mid request.
const EXPIRY_SKEW_MS = 60 * 1000;

function isExpired(expiresAt?: Date): boolean {
    if (!expiresAt) return false;
    return expiresAt.getTime() - EXPIRY_SKEW_MS <= Date.now();
}

/**
 * markIntegrationRevoked: flips an integration to the "revoked" status and
 * persists it. Shared by the token refresh path and the controller so both
 * report the same terminal state when a provider stops honoring our tokens.
 */
export async function markIntegrationRevoked(integration: HydratedDocument<IIntegration>): Promise<void> {
    integration.status = 'revoked';
    await integration.save();
}

/**
 * resolveAccessToken: returns a usable, decrypted access token for the given
 * integration, transparently refreshing it first if it is expired and the
 * provider supports refresh (currently only gmail).
 */
export async function resolveAccessToken(integration: HydratedDocument<IIntegration>): Promise<string> {
    const accessToken = decryptData(integration.accessToken, env.ENCRYPTION_KEY);
    if (!accessToken) {
        await markIntegrationRevoked(integration);
        throw new Error('Stored access token could not be decrypted');
    }

    if (integration.provider !== 'gmail' || !isExpired(integration.expiresAt)) {
        return accessToken;
    }

    const refreshToken = decryptData(integration.refreshToken, env.ENCRYPTION_KEY);
    if (!refreshToken) {
        await markIntegrationRevoked(integration);
        throw new Error('Gmail token expired and no refresh token is stored, the user must reconnect');
    }

    const config = OAUTH_CONFIG.gmail;
    const body = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
    });

    const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!response.ok) {
        await markIntegrationRevoked(integration);
        throw new Error(`Gmail token refresh failed with status ${response.status}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in?: number };

    integration.accessToken = encryptData(data.access_token, env.ENCRYPTION_KEY);
    integration.expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : integration.expiresAt;
    integration.status = 'active';
    await integration.save();

    return data.access_token;
}
