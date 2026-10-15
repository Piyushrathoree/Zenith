import type { Request, Response } from 'express';
import type { HydratedDocument } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { redisClient } from '../../middleware/rateLimit.middleware.ts';
import { OAUTH_CONFIG, isProviderConfigured, PROVIDER_LABELS } from './oauth.config.ts';
import { encryptData, decryptData } from '../../utils/crypto.ts';
import { env } from '../../config/env.ts';
import { Integration } from './integration.model.ts';
import { activeHiddenKeys } from './hiddenItem.model.ts';
import { ApiResponse } from '../../utils/ApiResponse.ts';
import { ApiError } from '../../utils/ApiError.ts';
import type { IIntegration } from './integration.model.ts';
import { getAdapter } from './adapters/registry.ts';
import { resolveAccessToken, markIntegrationRevoked } from './token.service.ts';
import { IntegrationAuthError, InvalidCursorError, errorCodeFor } from './adapters/types.ts';
import type {
    DetailParams,
    IntegrationErrorCode,
    IntegrationProvider,
    IntegrationProfile,
    UniversalTask,
} from './adapters/types.ts';
import { isValidRepoSlug } from './adapters/github.adapter.ts';
import {
    applySettingsUpdate,
    resolveSettings,
    toIntegrationEntry,
    type IntegrationEntrySource,
} from './integration.settings.ts';
import {
    createEtagStore,
    currentGeneration,
    invalidateProviderItems,
    readDetail,
    readProviderItems,
    writeDetail,
    writeProviderItems,
} from './integration.cache.ts';

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

        // A reconnect clears the previous failure: the UI must stop asking to reconnect at once,
        // not after the next successful sync.
        await Integration.findOneAndUpdate(
            { userId, provider: providerId },
            {
                $set: {
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
                $unset: { lastError: '', lastErrorAt: '' },
            },
            { upsert: true, new: true }
        );
        await invalidateProviderItems(userId, providerId);

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
        .lean<IntegrationEntrySource[]>();

    const connected = integrations.map(toIntegrationEntry);

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

    await invalidateProviderItems(userId, providerStr);

    res.status(200).json(new ApiResponse(200, { provider: providerStr }, 'Integration disconnected successfully'));
};

// ─── Connection health ───────────────────────────────────────────────────────────
// Written with updateOne, never save(): resolveAccessToken may already have saved the same
// document, and a health write must never fail the request it describes.

async function recordSyncSuccess(integration: HydratedDocument<IIntegration>): Promise<void> {
    try {
        await Integration.updateOne(
            { _id: integration._id },
            { $set: { lastSyncedAt: new Date() }, $unset: { lastError: '', lastErrorAt: '' } }
        );
    } catch (error) {
        console.warn(`[Integrations] Failed to record a sync for ${integration.provider}:`, error);
    }
}

/** Records a failure and returns its code. An auth failure also marks the integration revoked. */
async function recordSyncFailure(
    integration: HydratedDocument<IIntegration>,
    error: unknown
): Promise<IntegrationErrorCode> {
    const code = errorCodeFor(error);
    try {
        if (error instanceof IntegrationAuthError) {
            // The provider told us this token no longer works, so "active" is no longer truthful.
            // markIntegrationRevoked also records lastError='needs_reconnect'.
            await markIntegrationRevoked(integration);
        } else {
            await Integration.updateOne(
                { _id: integration._id },
                { $set: { lastError: code, lastErrorAt: new Date() } }
            );
        }
    } catch (saveError) {
        console.warn(`[Integrations] Failed to record an error for ${integration.provider}:`, saveError);
    }
    return code;
}

function firstQueryValue(value: unknown): string | undefined {
    const first = Array.isArray(value) ? value[0] : value;
    return typeof first === 'string' && first.length > 0 ? first : undefined;
}

function firstParam(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

// ─── Items ───────────────────────────────────────────────────────────────────────

interface ItemFetchError {
    provider: IntegrationProvider;
    error: string;
    code: IntegrationErrorCode;
}

interface ItemsPayload {
    items: UniversalTask[];
    errors: ItemFetchError[];
    nextCursors: Partial<Record<IntegrationProvider, string>>;
}

interface ProviderFetchOutcome {
    provider: IntegrationProvider;
    items: UniversalTask[];
    nextCursor?: string;
    error?: ItemFetchError;
}

/**
 * One provider's items. A first page comes from the per provider cache unless `forceRefresh`;
 * a cursor page is always live and never cached. Errors are never cached. InvalidCursorError is
 * rethrown so the handler can answer 400.
 */
async function fetchProviderItems(
    userId: string,
    integration: HydratedDocument<IIntegration>,
    options: { cursor?: string; forceRefresh: boolean }
): Promise<ProviderFetchOutcome> {
    const provider = integration.provider;
    const cacheable = !options.cursor;

    // Captured before the live fetch and reused for the write; see integration.cache.ts.
    const generation = cacheable ? await currentGeneration(userId, provider) : 0;
    if (cacheable && !options.forceRefresh) {
        const cached = await readProviderItems(userId, provider, generation);
        if (cached) return { provider, items: cached.items, nextCursor: cached.nextCursor };
    }

    try {
        const adapter = getAdapter(provider);
        if (!adapter) throw new Error(`No adapter registered for provider: ${provider}`);
        const accessToken = await resolveAccessToken(integration);
        const result = await adapter.fetchItems(accessToken, {
            settings: resolveSettings(integration.toObject().settings),
            cursor: options.cursor,
            etagStore: provider === 'github' ? createEtagStore(userId, provider) : undefined,
        });

        await recordSyncSuccess(integration);
        if (cacheable) {
            await writeProviderItems(userId, provider, generation, {
                items: result.items,
                nextCursor: result.nextCursor,
            });
        }
        return { provider, items: result.items, nextCursor: result.nextCursor };
    } catch (error) {
        if (error instanceof InvalidCursorError) throw error;
        console.warn(`[Integrations] Failed to fetch items for ${provider}:`, error);
        const code = await recordSyncFailure(integration, error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { provider, items: [], error: { provider, error: message, code } };
    }
}

/**
 * getItems: GET /items?provider=<p>&refresh=true&cursor=<c>
 *
 * Without `provider`: every active provider, each fetched independently so one failing provider
 * cannot hide another's items. With `provider`: that provider only, and `cursor` (only valid with
 * `provider`) fetches its next page. `nextCursors` holds an opaque cursor for every provider that
 * has more pages. Each provider is cached separately for 90s; the cache fails open.
 */
export const getItems = async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json(new ApiError(401, 'Unauthorized'));
        return;
    }

    const providerParam = firstQueryValue(req.query.provider);
    const cursor = firstQueryValue(req.query.cursor);
    const forceRefresh = req.query.refresh === 'true';

    if (providerParam && !isValidProvider(providerParam)) {
        res.status(400).json(new ApiError(400, `Unknown provider: ${providerParam}`));
        return;
    }
    if (cursor && !providerParam) {
        res.status(400).json(new ApiError(400, 'cursor requires provider'));
        return;
    }

    const payload: ItemsPayload = { items: [], errors: [], nextCursors: {} };
    let targets: HydratedDocument<IIntegration>[];

    if (providerParam) {
        // Hydrated, not .lean(): resolveAccessToken may refresh and save the token.
        const integration = await Integration.findOne({ userId, provider: providerParam });
        if (!integration) {
            res.status(200).json(new ApiResponse(200, payload, 'Items fetched successfully'));
            return;
        }
        if (integration.status !== 'active') {
            payload.errors.push({
                provider: integration.provider,
                error: `${PROVIDER_LABELS[integration.provider]} needs to be reconnected`,
                code: 'needs_reconnect',
            });
            res.status(200).json(new ApiResponse(200, payload, 'Items fetched successfully'));
            return;
        }
        targets = [integration];
    } else {
        targets = await Integration.find({ userId, status: 'active' });
    }

    let outcomes: ProviderFetchOutcome[];
    try {
        outcomes = await Promise.all(
            targets.map((integration) =>
                fetchProviderItems(userId, integration, { cursor, forceRefresh })
            )
        );
    } catch (error) {
        if (error instanceof InvalidCursorError) {
            res.status(400).json(new ApiError(400, 'Invalid cursor'));
            return;
        }
        throw error;
    }

    for (const outcome of outcomes) {
        if (outcome.error) {
            payload.errors.push(outcome.error);
            continue;
        }
        payload.items.push(...outcome.items);
        if (outcome.nextCursor) payload.nextCursors[outcome.provider] = outcome.nextCursor;
    }

    // Hidden and snoozed items are filtered here, after the cache, so un-hiding shows them at once.
    const hidden = await activeHiddenKeys(userId);
    if (hidden.size > 0) {
        payload.items = payload.items.filter((item) => !hidden.has(`${item.provider}:${item.externalId}`));
    }

    res.status(200).json(new ApiResponse(200, payload, 'Items fetched successfully'));
};

// ─── Item detail ─────────────────────────────────────────────────────────────────

const EXTERNAL_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * getItemDetail: GET /items/:provider/:externalId, the body of one item, loaded only when a card
 * is opened. GitHub also needs `?repo=owner/name&number=123`. Cached 5 minutes per item.
 */
export const getItemDetail = async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json(new ApiError(401, 'Unauthorized'));
        return;
    }

    const providerStr = firstParam(req.params.provider);
    const externalId = firstParam(req.params.externalId);
    if (!providerStr || !isValidProvider(providerStr)) {
        res.status(400).json(new ApiError(400, `Unknown provider: ${providerStr}`));
        return;
    }
    if (!externalId || !EXTERNAL_ID_PATTERN.test(externalId)) {
        res.status(400).json(new ApiError(400, 'Invalid item id'));
        return;
    }

    const params: DetailParams = {};
    let cacheId = externalId;
    if (providerStr === 'github') {
        const repo = firstQueryValue(req.query.repo);
        const number = Number(firstQueryValue(req.query.number));
        if (!repo || !isValidRepoSlug(repo) || !Number.isInteger(number) || number < 1) {
            res.status(400).json(
                new ApiError(400, 'GitHub items need ?repo=owner/name&number=<issue number>')
            );
            return;
        }
        params.repo = repo;
        params.number = number;
        cacheId = `${externalId}:${repo}#${number}`;
    }

    const integration = await Integration.findOne({ userId, provider: providerStr, status: 'active' });
    if (!integration) {
        res.status(404).json(
            new ApiError(404, `No connected ${PROVIDER_LABELS[providerStr]} integration was found`)
        );
        return;
    }

    const cached = await readDetail(userId, providerStr, cacheId);
    if (cached) {
        res.status(200).json(new ApiResponse(200, cached, 'Item detail fetched'));
        return;
    }

    try {
        const adapter = getAdapter(providerStr);
        if (!adapter) throw new Error(`No adapter registered for provider: ${providerStr}`);
        const accessToken = await resolveAccessToken(integration);
        const detail = await adapter.fetchDetail(accessToken, externalId, params);
        await writeDetail(userId, providerStr, cacheId, detail);
        res.status(200).json(new ApiResponse(200, detail, 'Item detail fetched'));
    } catch (error) {
        await sendProviderCallError(res, integration, error, 'fetch item detail');
    }
};

// Shared by detail and options: an auth failure revokes and answers 401, anything else 502.
async function sendProviderCallError(
    res: Response,
    integration: HydratedDocument<IIntegration>,
    error: unknown,
    what: string
): Promise<void> {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`[Integrations] ${integration.provider} failed to ${what}:`, error);
    if (error instanceof IntegrationAuthError) {
        try {
            if (integration.status === 'active') await markIntegrationRevoked(integration);
        } catch (saveError) {
            console.warn(`[Integrations] Failed to mark ${integration.provider} as revoked:`, saveError);
        }
        res.status(401).json(new ApiError(401, message));
        return;
    }
    res.status(502).json(new ApiError(502, message));
}

// ─── Settings and options ────────────────────────────────────────────────────────

/**
 * updateSettings: PUT /:provider/settings. Accepts only the keys for that provider, merges them,
 * bumps that provider's cache generation, and returns the updated GET /integrations entry.
 */
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json(new ApiError(401, 'Unauthorized'));
        return;
    }

    const providerStr = firstParam(req.params.provider);
    if (!providerStr || !isValidProvider(providerStr)) {
        res.status(400).json(new ApiError(400, `Unknown provider: ${providerStr}`));
        return;
    }

    const existing = await Integration.findOne({ userId, provider: providerStr })
        .select('settings')
        .lean<{ settings?: IntegrationEntrySource['settings'] }>();
    if (!existing) {
        res.status(404).json(
            new ApiError(404, `No connected ${PROVIDER_LABELS[providerStr]} integration was found`)
        );
        return;
    }

    const result = applySettingsUpdate(providerStr, resolveSettings(existing.settings), req.body);
    if (!result.ok) {
        res.status(400).json(new ApiError(400, result.message));
        return;
    }

    const updated = await Integration.findOneAndUpdate(
        { userId, provider: providerStr },
        { $set: { settings: result.settings } },
        { new: true }
    )
        .select('-accessToken -refreshToken')
        .lean<IntegrationEntrySource>();
    if (!updated) {
        res.status(404).json(
            new ApiError(404, `No connected ${PROVIDER_LABELS[providerStr]} integration was found`)
        );
        return;
    }

    await invalidateProviderItems(userId, providerStr);

    res.status(200).json(new ApiResponse(200, toIntegrationEntry(updated), 'Integration settings updated'));
};

/**
 * getOptions: GET /:provider/options, the choices the Configure screen offers.
 * gmail: { labels: {id, name}[] }, notion: { databases: {id, title}[] }, github: {}.
 */
export const getOptions = async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json(new ApiError(401, 'Unauthorized'));
        return;
    }

    const providerStr = firstParam(req.params.provider);
    if (!providerStr || !isValidProvider(providerStr)) {
        res.status(400).json(new ApiError(400, `Unknown provider: ${providerStr}`));
        return;
    }

    const integration = await Integration.findOne({ userId, provider: providerStr, status: 'active' });
    if (!integration) {
        res.status(404).json(
            new ApiError(404, `No connected ${PROVIDER_LABELS[providerStr]} integration was found`)
        );
        return;
    }

    try {
        const adapter = getAdapter(providerStr);
        if (!adapter) throw new Error(`No adapter registered for provider: ${providerStr}`);
        const accessToken = await resolveAccessToken(integration);
        const options = await adapter.fetchOptions(accessToken);
        res.status(200).json(new ApiResponse(200, options, 'Integration options fetched'));
    } catch (error) {
        await sendProviderCallError(res, integration, error, 'fetch options');
    }
};
