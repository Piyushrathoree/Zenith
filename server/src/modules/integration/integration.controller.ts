import type { Request, Response } from 'express';
import { OAUTH_CONFIG } from './oauth.config.ts';
import { encryptData, decryptData } from '../../utils/crypto.ts';
import { env } from '../../config/env.ts';
import { Integration } from './integration.model.ts';
import { ApiResponse } from '../../utils/ApiResponse.ts';
import { ApiError } from '../../utils/ApiError.ts';

/**
 * connectProvider — Step 1 of the OAuth flow.
 *
 * Builds the authorization URL for the given provider and redirects the user to it.
 * The `state` parameter is an AES-encrypted JSON payload containing:
 *   { u: userId, e: expiresAt }
 * This prevents CSRF attacks — we verify it in callbackProvider.
 */
export const connectProvider = async (req: Request, res: Response): Promise<void> => {
    const { provider } = req.params;
    const userId = req.userId;

    if (!userId) {
        res.status(401).json(new ApiError(401, 'Unauthorized'));
        return;
    }

    const providerStr = Array.isArray(provider) ? provider[0] : provider;
    const config = OAUTH_CONFIG[providerStr];
    if (!config) {
        res.status(400).json(new ApiError(400, `Unknown provider: ${providerStr}`));
        return;
    }

    // Encrypt state to prevent CSRF: contains userId + 10-minute expiry
    const statePayload = JSON.stringify({ u: userId, e: Date.now() + 10 * 60 * 1000 });
    const state = encryptData(statePayload, env.ENCRYPTION_KEY);

    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: `${env.API_BASE_URL}/api/v1/integrations/auth/${providerStr}/callback`,
        scope: config.scope,
        response_type: 'code',
        state,
        ...config.params,
    });

    res.redirect(`${config.authUrl}?${params.toString()}`);
};

/**
 * callbackProvider — Step 2 of the OAuth flow.
 *
 * Called by the provider after user grants access.
 * 1. Verifies the CSRF state
 * 2. Exchanges the code for access + refresh tokens
 * 3. Encrypts and stores tokens in the DB
 * 4. Redirects to frontend with success/error indicator
 */
export const callbackProvider = async (req: Request, res: Response): Promise<void> => {
    const { provider } = req.params;
    const { code, state } = req.query;
    const providerStr2 = Array.isArray(provider) ? provider[0] : provider;
    const codeStr = (Array.isArray(code) ? code[0] : code) as string | undefined;
    const stateStr = (Array.isArray(state) ? state[0] : state) as string | undefined;

    const config = OAUTH_CONFIG[providerStr2];
    if (!config) {
        res.redirect(`${env.FRONTEND_URL}/dashboard?integration_error=unknown_provider`);
        return;
    }

    if (!codeStr || !stateStr) {
        res.redirect(`${env.FRONTEND_URL}/dashboard?integration_error=missing_params`);
        return;
    }

    // ─── Verify CSRF state ─────────────────────────────────────────────────────
    let userId: string;
    try {
        const decrypted = decryptData(stateStr, env.ENCRYPTION_KEY);
        if (!decrypted) throw new Error('Decryption failed');

        const parsed = JSON.parse(decrypted);
        if (Date.now() > parsed.e) throw new Error('State expired');

        userId = parsed.u;
    } catch {
        console.error('[OAuth] CSRF state verification failed');
        res.redirect(`${env.FRONTEND_URL}/dashboard?integration_error=csrf_violation`);
        return;
    }

    try {
        // ─── Exchange code for tokens ──────────────────────────────────────────
        const tokenRes = await fetch(config.tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                code: codeStr,
                redirect_uri: `${env.API_BASE_URL}/api/v1/integrations/auth/${providerStr2}/callback`,
                grant_type: 'authorization_code',
            }),
        });

        if (!tokenRes.ok) {
            throw new Error(`Token exchange failed: ${tokenRes.status}`);
        }

        const tokenData = await tokenRes.json() as {
            access_token: string;
            refresh_token?: string;
            expires_in?: number;
        };

        // ─── Encrypt and upsert in DB ──────────────────────────────────────────
        const encryptedAccess = encryptData(tokenData.access_token, env.ENCRYPTION_KEY);
        const encryptedRefresh = tokenData.refresh_token
            ? encryptData(tokenData.refresh_token, env.ENCRYPTION_KEY)
            : '';

        await Integration.findOneAndUpdate(
            { userId, provider: providerStr2 },
            {
                userId,
                provider: providerStr2,
                accessToken: encryptedAccess,
                refreshToken: encryptedRefresh,
                profile: { username: 'connected', avatar: '' }, // updated on first API call
                expiresAt: tokenData.expires_in
                    ? new Date(Date.now() + tokenData.expires_in * 1000)
                    : undefined,
                status: 'active',
            },
            { upsert: true, new: true }
        );

        res.redirect(`${env.FRONTEND_URL}/dashboard?integration_success=${providerStr2}`);
    } catch (error) {
        console.error(`[OAuth] ${providerStr2} callback error:`, error);
        res.redirect(`${env.FRONTEND_URL}/dashboard?integration_error=server_error`);
    }
};
