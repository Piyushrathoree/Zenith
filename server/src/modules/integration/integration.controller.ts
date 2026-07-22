import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { redisClient } from '../../middleware/rateLimit.middleware.ts';
import { OAUTH_CONFIG, isProviderConfigured, PROVIDER_LABELS } from './oauth.config.ts';
import { encryptData, decryptData } from '../../utils/crypto.ts';
import { env } from '../../config/env.ts';
import { Integration } from './integration.model.ts';
import { ApiResponse } from '../../utils/ApiResponse.ts';
import { ApiError } from '../../utils/ApiError.ts';
import { getAdapter } from './adapters/registry.ts';
import { resolveAccessToken, markIntegrationRevoked } from './token.service.ts';
import { IntegrationAuthError } from './adapters/types.ts';
import type { IntegrationProvider, IntegrationProfile, UniversalTask } from './adapters/types.ts';

const cacheRedis = redisClient;

const ITEMS_CACHE_TTL_SECONDS = 90;

function itemsCacheGenerationKey(userId: string): string {
    return `integrations:items:gen:${userId}`;
}

function itemsCacheKey(userId: string, generation: number): string {
    return `integrations:items:${userId}:${generation}`;
}

interface ItemFetchError {
    provider: IntegrationProvider;
    error: string;
}

interface ItemsPayload {
    items: UniversalTask[];
    errors: ItemFetchError[];
}

async function currentCacheGeneration(userId: string): Promise<number> {
    try {
        const raw = await cacheRedis.get(itemsCacheGenerationKey(userId));
        return raw ? parseInt(raw, 10) || 0 : 0;
    } catch (error) {
        console.warn('[Integrations] Cache generation read failed, defaulting to 0:', error);
        return 0;
    }
}

async function readItemsCache(userId: string, generation: number): Promise<ItemsPayload | null> {
    try {
        const raw = await cacheRedis.get(itemsCacheKey(userId, generation));
        return raw ? (JSON.parse(raw) as ItemsPayload) : null;
    } catch (error) {
        console.warn('[Integrations] Cache read failed, falling back to a live fetch:', error);
        return null;
    }
}

async function writeItemsCache(
    userId: string,
    generation: number,
    payload: ItemsPayload
): Promise<void> {
    // A payload with partial failures is never cached: pinning a transient provider error for
    // the full TTL would hide a reconnect prompt behind a stale, success looking cache entry.
    if (payload.errors.length > 0) return;

    try {
        await cacheRedis.set(
            itemsCacheKey(userId, generation),
            JSON.stringify(payload),
            'EX',
            ITEMS_CACHE_TTL_SECONDS
        );
    } catch (error) {
        console.warn('[Integrations] Cache write failed:', error);
    }
}

async function invalidateItemsCache(userId: string): Promise<void> {
    try {
        // INCR rather than DEL of the current key: see the comment above itemsCacheGenerationKey.
        // This orphans any write from a request already in flight instead of racing it.
        await cacheRedis.incr(itemsCacheGenerationKey(userId));
    } catch (error) {
        console.warn('[Integrations] Cache invalidation failed:', error);
    }
}

// ─── Provider validation ─────────────────────────────────────────────────────────
const VALID_PROVIDERS: readonly IntegrationProvider[] = ['github', 'gmail', 'notion'];

function isValidProvider(value: string): value is IntegrationProvider {
    return (VALID_PROVIDERS as readonly string[]).includes(value);
}

type ProviderCheck =
    | { ok: true; provider: IntegrationProvider }
    | { ok: false; status: number; message: string };

// Shared by connectProvider and getConnectUrl: a provider must both be one of the three known
// providers AND have credentials configured on the server before we build a consent URL for it.
function checkConfiguredProvider(providerStr: string | undefined): ProviderCheck {
    if (!providerStr || !isValidProvider(providerStr)) {
        return { ok: false, status: 400, message: `Unknown provider: ${providerStr}` };
    }

    if (!isProviderConfigured(providerStr)) {
        return {
            ok: false,
            status: 400,
            message: `${PROVIDER_LABELS[providerStr]} is not configured on this server`,
        };
    }

    return { ok: true, provider: providerStr };
}

// The state window: how long a minted state stays valid, and the TTL given to its single use
// nonce in Redis. Kept as one constant so the two can never drift apart.
const STATE_TTL_MS = 10 * 60 * 1000;
const STATE_NONCE_TTL_SECONDS = STATE_TTL_MS / 1000;

function stateNonceKey(nonce: string): string {
    return `integrations:state:${nonce}`;
}

// Builds the provider consent URL. Callers must validate the provider with
// checkConfiguredProvider first, since this assumes a known, configured provider.
function buildConsentUrl(provider: IntegrationProvider, userId: string): string {
    const config = OAUTH_CONFIG[provider];

    // Encrypt state to prevent CSRF: contains userId, the provider it was minted for, a 10
    // minute expiry, and a random single use nonce.
    //   - Binding the provider (p) stops a state minted for one provider being replayed against
    //     a different provider's callback, a confused deputy attack where an attacker's own
    //     account on provider B gets attached to a victim who only ever consented to provider A.
    //   - The nonce (n) lets callbackProvider atomically claim the state exactly once in Redis,
    //     so a captured state cannot be replayed for the rest of its 10 minute window.
    const statePayload = JSON.stringify({
        u: userId,
        p: provider,
        e: Date.now() + STATE_TTL_MS,
        n: randomUUID(),
    });
    const state = encryptData(statePayload, env.ENCRYPTION_KEY);

    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: `${env.API_BASE_URL}/api/v1/integrations/auth/${provider}/callback`,
        scope: config.scope,
        response_type: 'code',
        state,
        ...config.params,
    });

    return `${config.authUrl}?${params.toString()}`;
}

// Builds the fetch() init for the token exchange request. Notion (authStyle: "basic") rejects
// credentials sent in the body and requires them as an HTTP Basic auth header instead; GitHub
// and Gmail (authStyle: "body", the default) expect client_id/client_secret in the JSON body.
function buildTokenRequestInit(
    config: (typeof OAUTH_CONFIG)[string],
    codeStr: string,
    redirectUri: string
): RequestInit {
    if (config.authStyle === 'basic') {
        const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
        return {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Basic ${basicAuth}`,
            },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                code: codeStr,
                redirect_uri: redirectUri,
            }),
        };
    }

    return {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code: codeStr,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        }),
    };
}

interface TokenExchangeResponse {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
}

interface LeanIntegration {
    provider: IntegrationProvider;
    status: 'active' | 'expired' | 'revoked';
    profile: { username: string; avatar: string };
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * connectProvider: Step 1 of the OAuth flow, redirect variant.
 *
 * Builds the authorization URL for the given provider and redirects the browser to it.
 * Kept as a plain redirect (rather than requiring a bearer token) so it also works from a
 * curl / plain link for manual testing. The real client flow uses GET /auth/:provider/url
 * instead, since a full page navigation cannot carry an Authorization header.
 */
export const connectProvider = async (req: Request, res: Response): Promise<void> => {
    const { provider } = req.params;
    const userId = req.userId;

    if (!userId) {
        res.status(401).json(new ApiError(401, 'Unauthorized'));
        return;
    }

    const providerStr = Array.isArray(provider) ? provider[0] : provider;
    const check = checkConfiguredProvider(providerStr);
    if (!check.ok) {
        res.status(check.status).json(new ApiError(check.status, check.message));
        return;
    }

    res.redirect(buildConsentUrl(check.provider, userId));
};

/**
 * getConnectUrl: Step 1 of the OAuth flow, JSON variant.
 *
 * A full page browser navigation cannot send an Authorization header, so the client cannot
 * simply link to /auth/:provider. This endpoint is called with fetch and a bearer token, and
 * returns the consent URL as JSON so the client can set window.location.href to it.
 */
export const getConnectUrl = async (req: Request, res: Response): Promise<void> => {
    const { provider } = req.params;
    const userId = req.userId;

    if (!userId) {
        res.status(401).json(new ApiError(401, 'Unauthorized'));
        return;
    }

    const providerStr = Array.isArray(provider) ? provider[0] : provider;
    const check = checkConfiguredProvider(providerStr);
    if (!check.ok) {
        res.status(check.status).json(new ApiError(check.status, check.message));
        return;
    }

    const url = buildConsentUrl(check.provider, userId);
    res.status(200).json(new ApiResponse(200, { url }, 'Connect URL generated'));
};

/**
 * callbackProvider: Step 2 of the OAuth flow.
 *
 * Called by the provider redirecting the user's browser after they grant access, so it cannot
 * carry an Authorization header. Identity comes from the encrypted `state` query parameter
 * instead, which is exactly what it is for. This is why this route is registered ahead of the
 * auth middleware in integration.routes.ts, and why it carries its own oauthCallbackLimiter in
 * integration.routes.ts instead of the shared apiLimiter.
 *
 * 1. Validates the provider param against the known enum BEFORE writing anything to Mongo
 * 2. Verifies the CSRF state: signature, provider binding, expiry, then single use nonce claim
 * 3. Exchanges the code for access + refresh tokens
 * 4. Fetches the provider profile (best effort) and stores everything in the DB
 * 5. Redirects to the frontend with a success or error indicator
 *
 * On failure the redirect carries `?integration_error=<code>`, one of: invalid_provider,
 * invalid_state, token_exchange_failed, server_error, rate_limited. rate_limited is emitted by
 * oauthCallbackLimiter in rateLimit.middleware.ts before this function ever runs, not by
 * anything below.
 */
export const callbackProvider = async (req: Request, res: Response): Promise<void> => {
    const { provider } = req.params;
    const { code, state } = req.query;
    const providerStr = Array.isArray(provider) ? provider[0] : provider;
    const codeStr = (Array.isArray(code) ? code[0] : code) as string | undefined;
    const stateStr = (Array.isArray(state) ? state[0] : state) as string | undefined;

    // Never write an unvalidated route param into the Integration model's `provider` enum
    // field: validate membership before anything else touches Mongo.
    if (!providerStr || !isValidProvider(providerStr)) {
        res.redirect(`${env.FRONTEND_URL}/dashboard?integration_error=invalid_provider`);
        return;
    }
    const providerId: IntegrationProvider = providerStr;
    const config = OAUTH_CONFIG[providerId];

    if (!codeStr || !stateStr) {
        res.redirect(`${env.FRONTEND_URL}/dashboard?integration_error=invalid_state`);
        return;
    }

    // ─── Verify CSRF state ─────────────────────────────────────────────────────
    let userId: string;
    let nonce: string;
    try {
        const decrypted = decryptData(stateStr, env.ENCRYPTION_KEY);
        if (!decrypted) throw new Error('Decryption failed');

        const parsed = JSON.parse(decrypted);
        if (Date.now() > parsed.e) throw new Error('State expired');
        // The provider is part of the signed payload, not just the route param, so a state
        // minted for one provider cannot be replayed against a different provider's callback.
        // A state with no `p` at all (an old, in flight state minted before this check existed)
        // is treated the same as a mismatch: reject it, rather than let it slip through with
        // the check silently skipped.
        if (!parsed.p || parsed.p !== providerId) {
            throw new Error('State was not minted for this provider');
        }
        if (!parsed.n) throw new Error('State missing nonce');

        userId = parsed.u;
        nonce = parsed.n;
    } catch {
        console.error('[OAuth] CSRF state verification failed');
        res.redirect(`${env.FRONTEND_URL}/dashboard?integration_error=invalid_state`);
        return;
    }

    // ─── Claim the state nonce so it can only ever be used once ────────────────
    // Unlike every other Redis call in this module (the items cache above), this one must fail
    // CLOSED, not open: it is a security control, not a speed optimisation. If Redis is
    // unreachable we cannot tell whether this nonce was already claimed, so we cannot rule out
    // a replay, and the only safe answer is to reject the callback rather than risk letting a
    // captured state through repeatedly for the rest of its 10 minute window.
    let claimed: string | null;
    try {
        claimed = await redisClient.set(
            stateNonceKey(nonce),
            '1',
            'EX',
            STATE_NONCE_TTL_SECONDS,
            'NX'
        );
    } catch (error) {
        console.error('[OAuth] State nonce claim failed, Redis unreachable:', error);
        res.redirect(`${env.FRONTEND_URL}/dashboard?integration_error=server_error`);
        return;
    }
    if (!claimed) {
        console.error('[OAuth] CSRF state replay detected, nonce already claimed');
        res.redirect(`${env.FRONTEND_URL}/dashboard?integration_error=invalid_state`);
        return;
    }

    const redirectUri = `${env.API_BASE_URL}/api/v1/integrations/auth/${providerId}/callback`;

    // ─── Exchange code for tokens ──────────────────────────────────────────────
    let tokenData: TokenExchangeResponse;
    try {
        const tokenRes = await fetch(
            config.tokenUrl,
            buildTokenRequestInit(config, codeStr, redirectUri)
        );

        if (!tokenRes.ok) {
            throw new Error(`Token exchange failed: ${tokenRes.status}`);
        }

        tokenData = (await tokenRes.json()) as TokenExchangeResponse;
    } catch (error) {
        console.error(`[OAuth] ${providerId} token exchange failed:`, error);
        res.redirect(`${env.FRONTEND_URL}/dashboard?integration_error=token_exchange_failed`);
        return;
    }

    // ─── Encrypt, fetch profile, and upsert in DB ──────────────────────────────
    try {
        const encryptedAccess = encryptData(tokenData.access_token, env.ENCRYPTION_KEY);
        const encryptedRefresh = tokenData.refresh_token
            ? encryptData(tokenData.refresh_token, env.ENCRYPTION_KEY)
            : '';

        // A profile lookup failure must never prevent storing a valid token: fall back to a
        // placeholder profile so the connection still succeeds, and let a later refresh pick
        // up the real profile.
        let profile: IntegrationProfile = { username: providerId, avatar: '' };
        try {
            const adapter = getAdapter(providerId);
            if (adapter) {
                profile = await adapter.fetchProfile(tokenData.access_token);
            }
        } catch (profileError) {
            console.warn(`[OAuth] ${providerId} profile lookup failed, using fallback:`, profileError);
        }

        await Integration.findOneAndUpdate(
            { userId, provider: providerId },
            {
                userId,
                provider: providerId,
                accessToken: encryptedAccess,
                refreshToken: encryptedRefresh,
                profile,
                expiresAt: tokenData.expires_in
                    ? new Date(Date.now() + tokenData.expires_in * 1000)
                    : undefined,
                status: 'active',
            },
            { upsert: true, new: true }
        );

        res.redirect(`${env.FRONTEND_URL}/dashboard?integration_success=${providerId}`);
    } catch (error) {
        console.error(`[OAuth] ${providerId} callback error:`, error);
        res.redirect(`${env.FRONTEND_URL}/dashboard?integration_error=server_error`);
    }
};

/**
 * listProviders: every provider Zenith knows about, and whether it is configured on this
 * server. Lets the client hide a provider that has no credentials rather than offering a
 * connect button that will always fail.
 */
export const listProviders = async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json(new ApiError(401, 'Unauthorized'));
        return;
    }

    const providers = (Object.keys(PROVIDER_LABELS) as IntegrationProvider[]).map((provider) => ({
        provider,
        label: PROVIDER_LABELS[provider],
        configured: isProviderConfigured(provider),
    }));

    res.status(200).json(new ApiResponse(200, providers, 'Providers fetched successfully'));
};

/**
 * listIntegrations: the caller's connected integrations. Token fields are never selected or
 * returned.
 */
export const listIntegrations = async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json(new ApiError(401, 'Unauthorized'));
        return;
    }

    const integrations = await Integration.find({ userId })
        .select('-accessToken -refreshToken')
        .lean<LeanIntegration[]>();

    const connected = integrations.map((integration) => ({
        provider: integration.provider,
        status: integration.status,
        profile: integration.profile,
        expiresAt: integration.expiresAt ? integration.expiresAt.toISOString() : undefined,
        createdAt: integration.createdAt.toISOString(),
        updatedAt: integration.updatedAt.toISOString(),
    }));

    res.status(200).json(new ApiResponse(200, connected, 'Integrations fetched successfully'));
};

/**
 * disconnectProvider: removes the caller's stored integration for a provider and invalidates
 * their cached items so the next GET /items reflects the disconnect immediately.
 */
export const disconnectProvider = async (req: Request, res: Response): Promise<void> => {
    const { provider } = req.params;
    const userId = req.userId;

    if (!userId) {
        res.status(401).json(new ApiError(401, 'Unauthorized'));
        return;
    }

    const providerStr = Array.isArray(provider) ? provider[0] : provider;
    if (!providerStr || !isValidProvider(providerStr)) {
        res.status(400).json(new ApiError(400, `Unknown provider: ${providerStr}`));
        return;
    }

    const deleted = await Integration.findOneAndDelete({ userId, provider: providerStr });
    if (!deleted) {
        res.status(404).json(
            new ApiError(404, `No connected ${PROVIDER_LABELS[providerStr]} integration was found`)
        );
        return;
    }

    await invalidateItemsCache(userId);

    res.status(200).json(new ApiResponse(200, { provider: providerStr }, 'Integration disconnected successfully'));
};

/**
 * getItems: the caller's aggregated feed across every connected, active provider.
 *
 * Each provider is resolved and fetched independently inside its own try/catch so one revoked
 * or failing provider cannot break, or hide, another provider's items. The client uses the
 * `errors` array to show a targeted reconnect prompt instead of silently rendering an empty
 * feed. Results are cached per user in Redis for a short TTL; the cache fails open, so a Redis
 * outage degrades speed and never correctness.
 */
export const getItems = async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json(new ApiError(401, 'Unauthorized'));
        return;
    }

    const forceRefresh = req.query.refresh === 'true';

    // Captured once, up front, and reused for both the read below and the write at the end of
    // this request. See the comment above itemsCacheGenerationKey: if a disconnect bumps the
    // generation while this request's live fetch is still in flight, this request's own write
    // later on targets the generation it started with, not the new one, so it cannot resurrect
    // a disconnected provider's items into the cache entry future requests actually read.
    const generation = await currentCacheGeneration(userId);

    if (!forceRefresh) {
        const cached = await readItemsCache(userId, generation);
        if (cached) {
            res.status(200).json(new ApiResponse(200, cached, 'Items fetched successfully'));
            return;
        }
    }

    // Hydrated documents, not .lean(): resolveAccessToken may refresh an expired token and
    // save it back onto the document, which needs a full Mongoose document instance.
    const integrations = await Integration.find({ userId, status: 'active' });

    const settled = await Promise.all(
        integrations.map(async (integration) => {
            try {
                const accessToken = await resolveAccessToken(integration);
                const adapter = getAdapter(integration.provider);
                if (!adapter) {
                    throw new Error(`No adapter registered for provider: ${integration.provider}`);
                }
                const items = await adapter.fetchItems(accessToken);
                return { provider: integration.provider, items, error: null as string | null };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                console.warn(`[Integrations] Failed to fetch items for ${integration.provider}:`, error);

                if (error instanceof IntegrationAuthError) {
                    // The provider itself told us this token no longer works (401/403), so
                    // "active" is no longer truthful, transition to "revoked" so listIntegrations
                    // and the UI can prompt a reconnect. Best effort and isolated in its own
                    // try/catch: a database failure while recording the revocation must not turn
                    // this provider's fetch failure into a whole request failure.
                    try {
                        await markIntegrationRevoked(integration);
                    } catch (saveError) {
                        console.warn(
                            `[Integrations] Failed to mark ${integration.provider} as revoked:`,
                            saveError
                        );
                    }
                }

                return { provider: integration.provider, items: [] as UniversalTask[], error: message };
            }
        })
    );

    const payload: ItemsPayload = { items: [], errors: [] };
    for (const entry of settled) {
        if (entry.error) {
            payload.errors.push({ provider: entry.provider, error: entry.error });
        } else {
            payload.items.push(...entry.items);
        }
    }

    await writeItemsCache(userId, generation, payload);

    res.status(200).json(new ApiResponse(200, payload, 'Items fetched successfully'));
};
