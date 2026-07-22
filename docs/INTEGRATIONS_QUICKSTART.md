# Zenith Integrations: Quickstart

> **Status as of 2026-07-19: Phases C through G are built and on disk.** Read them to understand the
> code, not to write it. The implementation diverges from this doc in a few deliberate places:
> `UniversalTask` carries optional provider specific fields (labels, assignees, snippets) so the
> existing rich cards survive rather than being replaced by a generic card; connecting goes through
> `GET /auth/:provider/url` because a browser navigation cannot send a bearer token; the OAuth
> callback is registered ahead of `authMiddleware` and has its own rate limiter; and the `state`
> parameter is now bound to its provider and single use.
>
> **Phase B is the only phase still yours**, and Phase H is how you check the result.

For full explanations, see `INTEGRATIONS_GUIDE.md`. This is the condensed, action first version: short steps, copy pasteable code, minimal theory.

## Contents

* [Phase A: The architecture in 30 seconds](#phase-a-the-architecture-in-30-seconds)
* [Phase B: OAuth provider setup (external)](#phase-b-oauth-provider-setup-external)
* [Phase C: Backend fix (the provider enum bug)](#phase-c-backend-fix-the-provider-enum-bug)
* [Phase D: Adapter layer](#phase-d-adapter-layer)
* [Phase E: New endpoints](#phase-e-new-endpoints)
* [Phase F: Frontend wiring](#phase-f-frontend-wiring)
* [Phase G: Notion (roadmap)](#phase-g-notion-roadmap)
* [Phase H: Test checklist and troubleshooting](#phase-h-test-checklist-and-troubleshooting)

Stack: `server` (Bun + Express 5 + MongoDB) at `/mnt/a/Codebase/Zenith/server`, `client` (Next.js 16 + React 19) at `/mnt/a/Codebase/Zenith/client`.

***

## Phase A: The architecture in 30 seconds

Seven links, in build order:

1. **Connect**: browser is redirected (full page nav, not fetch) to `GET /api/v1/integrations/auth/:provider`.
2. **Consent**: GitHub/Google shows their screen, user approves, redirected back with a `code`.
3. **Token storage**: callback exchanges `code` for tokens, AES encrypts them, upserts an `Integration` doc in MongoDB.
4. **Adapter fetch**: backend decrypts the token, refreshes if expired, hands it to a provider specific adapter.
5. **Normalize**: every adapter returns the same shape, `UniversalTask`. This is the core idea: nothing downstream needs to know GitHub from Gmail.
6. **Serve**: `GET /integrations/items` aggregates `UniversalTask[]` across every connected provider.
7. **Render + drag to kanban**: frontend renders cards; dropping one on a column calls `POST /api/v1/planner/tasks/:channel`, creating a real `Task` in MongoDB.

Build order: fix the foundation (C), build the adapters (D), expose over HTTP (E), wire the UI (F).

***

## Phase B: OAuth provider setup (external)

Do this before writing adapter code. Both providers reject redirects to unregistered URLs.

### B.1 GitHub OAuth App

- [ ] Go to `https://github.com/settings/developers` > OAuth Apps > New OAuth App.
- [ ] Application name: anything. Homepage URL: `http://localhost:3000`.
- [ ] Authorization callback URL (must match exactly): `http://localhost:8000/api/v1/integrations/auth/github/callback`
- [ ] Register, then copy the Client ID and generate/copy the Client secret (shown once).
- [ ] Scopes are requested at connect time, not on the app itself; `oauth.config.ts` already asks for `repo user notifications`.

### B.2 Google Cloud + Gmail API

- [ ] Create/reuse a project at `https://console.cloud.google.com/`.
- [ ] APIs & Services > Library > enable "Gmail API".
- [ ] APIs & Services > OAuth consent screen: User type External, fill app name/support email, add scope `https://www.googleapis.com/auth/gmail.readonly`, add your own account under Test users (while in Testing status).
- [ ] APIs & Services > Credentials > Create Credentials > OAuth client ID > Web application.
- [ ] Authorized redirect URI: `http://localhost:8000/api/v1/integrations/auth/gmail/callback` (note: `gmail`, not `google`, because of the Phase C fix below).
- [ ] Copy Client ID and Client secret.

Why `access_type: offline` and `prompt: consent` matter (already set in `oauth.config.ts`):

```ts
google: {
    params: {
        access_type: 'offline',   // ensures we get a refresh token
        prompt: 'consent',        // forces consent so refresh token always returned
    },
},
```

Without `offline`, Google never issues a refresh token, and access tokens expire in about an hour. Without forcing `consent`, a returning user who already authorized once may not get a refresh token again.

### B.3 Fill in `.env`

Copy `server/.env.example` to `server/.env`, then set:

```bash
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GITHUB_CLIENT_ID=<from GitHub OAuth App>
GITHUB_CLIENT_SECRET=<from GitHub OAuth App>
ENCRYPTION_KEY=<any string, EXACTLY 32 characters>
```

`ENCRYPTION_KEY` is validated by Zod (`server/src/config/env.ts`) and the server refuses to boot if it is not exactly 32 characters. It is used for AES encryption of every stored token (`server/src/utils/crypto.ts`). Generate a real one:

```bash
node -p "require('crypto').randomBytes(16).toString('hex')"
```

Notion credentials are not needed yet, see Phase G.

***

## Phase C: Backend fix (the provider enum bug)

### The bug

`server/src/modules/integration/oauth.config.ts` keys the Google entry as `google`. `server/src/modules/integration/integration.model.ts` defines the provider enum as `['github', 'gmail', 'notion']`, no `'google'`. Result: a Google connect flow completes token exchange fine, then `Integration.findOneAndUpdate({ ..., provider: 'google' }, ...)` throws a Mongoose `ValidationError`, caught silently, and the user is redirected to `/dashboard?integration_error=server_error` with no useful signal. Google integration is permanently broken until this is fixed, regardless of correct credentials.

### The fix

Rename the config key from `google` to `gmail` so the vocabulary matches the rest of the app (the frontend already only ever says `'gmail'`, never `'google'`). Edit `server/src/modules/integration/oauth.config.ts`:

```ts
export const OAUTH_CONFIG: Record<string, OAuthProviderConfig> = {
    gmail: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        params: {
            access_type: 'offline',
            prompt: 'consent',
        },
    },
    github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scope: 'repo user notifications',
    },
    // notion: {} (added in Phase G)
};
```

No controller changes needed: `connectProvider`/`callbackProvider` both just use `req.params.provider` as the lookup key and the stored value, so once the config key and enum agree, everything works. The connect link becomes `/api/v1/integrations/auth/gmail`.

- [ ] If you created the Google credential before this rename, go back and fix the redirect URI to end in `/auth/gmail/callback`, not `/auth/google/callback`.

### Verify

```bash
cd /mnt/a/Codebase/Zenith/server
bun run dev
curl -i http://localhost:8000/api/v1/integrations/auth/github \
  -H "Authorization: Bearer <your JWT>"
```

Expect a `302` with `Location` pointing at `github.com`. Repeat for `gmail`, expect `Location` pointing at `accounts.google.com`.

***

## Phase D: Adapter layer

Every provider gets one class: token in, `UniversalTask[]` out. This keeps downstream code (endpoints, frontend cards, kanban drop handler) provider agnostic.

### D.1 Folder + shared types

```bash
mkdir -p /mnt/a/Codebase/Zenith/server/src/modules/integration/adapters
```

`server/src/modules/integration/adapters/types.ts`:

```ts
export interface UniversalTask {
    externalId: string;
    title: string;
    link: string;
    status: string;
    type: 'issue' | 'pr' | 'email';
    provider: 'github' | 'gmail';
}

export interface IntegrationAdapter {
    fetchItems(accessToken: string): Promise<UniversalTask[]>;
}
```

### D.2 GitHubAdapter

`GET /issues` returns both issues and PRs (PRs carry a `pull_request` key). `server/src/modules/integration/adapters/github.adapter.ts`:

```ts
import type { IntegrationAdapter, UniversalTask } from './types.ts';

interface GitHubIssueResponse {
    id: number;
    number: number;
    title: string;
    html_url: string;
    state: 'open' | 'closed';
    repository_url: string;
    pull_request?: { url: string; merged_at: string | null };
}

export class GitHubAdapter implements IntegrationAdapter {
    async fetchItems(accessToken: string): Promise<UniversalTask[]> {
        const res = await fetch(
            'https://api.github.com/issues?filter=assigned&state=all&per_page=30',
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/vnd.github+json',
                    'User-Agent': 'zenith-app',
                },
            }
        );

        if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);

        const items = (await res.json()) as GitHubIssueResponse[];

        return items.map((item): UniversalTask => {
            const isPullRequest = Boolean(item.pull_request);
            const status = isPullRequest && item.pull_request?.merged_at ? 'merged' : item.state;
            const repoSlug = item.repository_url.split('/repos/')[1] ?? '';

            return {
                externalId: String(item.id),
                title: repoSlug ? `${repoSlug}: ${item.title}` : item.title,
                link: item.html_url,
                status,
                type: isPullRequest ? 'pr' : 'issue',
                provider: 'github',
            };
        });
    }
}
```

`filter=assigned` scopes to items assigned to the user, not every repo they can see. Merged status comes free from `pull_request.merged_at`, no extra request per PR. Decryption never happens inside the adapter, that is one layer up (D.3, E.1).

### D.3 Token refresh helper (needed before GmailAdapter)

Gmail tokens expire in about an hour; refreshing lives outside the adapter so the adapter stays a pure "token in, tasks out" function. `server/src/modules/integration/token.service.ts`:

```ts
import { env } from '../../config/env.ts';
import { encryptData, decryptData } from '../../utils/crypto.ts';
import { Integration } from './integration.model.ts';
import type { HydratedDocument } from 'mongoose';

interface IntegrationLike {
    provider: string;
    accessToken: string;
    refreshToken: string;
    expiresAt?: Date;
}

export async function resolveAccessToken(
    integration: HydratedDocument<IntegrationLike>
): Promise<string> {
    const accessToken = decryptData(integration.accessToken, env.ENCRYPTION_KEY);

    const isExpired = integration.expiresAt
        ? Date.now() > integration.expiresAt.getTime()
        : false;

    if (integration.provider !== 'gmail' || !isExpired) {
        return accessToken;
    }

    if (!integration.refreshToken) {
        throw new Error('Gmail token expired and no refresh token is stored');
    }

    const refreshToken = decryptData(integration.refreshToken, env.ENCRYPTION_KEY);

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    });

    if (!res.ok) {
        // Google returns invalid_grant when the refresh token was revoked
        integration.status = 'revoked';
        await integration.save();
        throw new Error(`Gmail token refresh failed: ${res.status}`);
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };

    integration.accessToken = encryptData(data.access_token, env.ENCRYPTION_KEY);
    integration.expiresAt = new Date(Date.now() + data.expires_in * 1000);
    await integration.save();

    return data.access_token;
}
```

### D.4 GmailAdapter

Two calls per message: `messages.list` gives IDs, `messages.get` (metadata only, Subject header) gives the title. `server/src/modules/integration/adapters/gmail.adapter.ts`:

```ts
import type { IntegrationAdapter, UniversalTask } from './types.ts';

interface GmailListResponse {
    messages?: { id: string; threadId: string }[];
}

interface GmailMessageResponse {
    id: string;
    labelIds?: string[];
    payload?: { headers?: { name: string; value: string }[] };
}

function getHeader(message: GmailMessageResponse, name: string): string {
    return message.payload?.headers?.find(h => h.name === name)?.value ?? '(no subject)';
}

export class GmailAdapter implements IntegrationAdapter {
    async fetchItems(accessToken: string): Promise<UniversalTask[]> {
        const listRes = await fetch(
            'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=in:inbox',
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!listRes.ok) throw new Error(`Gmail API error: ${listRes.status} ${listRes.statusText}`);

        const { messages = [] } = (await listRes.json()) as GmailListResponse;

        const fullMessages = await Promise.all(
            messages.map(async ({ id }) => {
                const res = await fetch(
                    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}` +
                    `?format=metadata&metadataHeaders=Subject`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                if (!res.ok) return null;
                return (await res.json()) as GmailMessageResponse;
            })
        );

        return fullMessages
            .filter((m): m is GmailMessageResponse => m !== null)
            .map((message): UniversalTask => ({
                externalId: message.id,
                title: getHeader(message, 'Subject'),
                link: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
                status: message.labelIds?.includes('UNREAD') ? 'unread' : 'read',
                type: 'email',
                provider: 'gmail',
            }));
    }
}
```

### D.5 Registry

`server/src/modules/integration/adapters/registry.ts`:

```ts
import type { IntegrationAdapter } from './types.ts';
import { GitHubAdapter } from './github.adapter.ts';
import { GmailAdapter } from './gmail.adapter.ts';

// Add new providers here and nowhere else (see Phase G for Notion).
const ADAPTER_REGISTRY: Record<string, IntegrationAdapter> = {
    github: new GitHubAdapter(),
    gmail: new GmailAdapter(),
};

export function getAdapter(provider: string): IntegrationAdapter | undefined {
    return ADAPTER_REGISTRY[provider];
}
```

Verify: `cd /mnt/a/Codebase/Zenith/server && bun run build` should type check clean.

***

## Phase E: New endpoints

Three routes: list connected integrations, disconnect one, aggregate items.

### E.1 Controllers

Add to `server/src/modules/integration/integration.controller.ts`:

```ts
import { getAdapter } from './adapters/registry.ts';
import { resolveAccessToken } from './token.service.ts';

export const listIntegrations = async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId;
    if (!userId) { res.status(401).json(new ApiError(401, 'Unauthorized')); return; }

    const integrations = await Integration.find({ userId })
        .select('-accessToken -refreshToken')
        .lean();

    res.status(200).json(new ApiResponse(200, integrations, 'Integrations fetched successfully'));
};

export const disconnectProvider = async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId;
    const { provider } = req.params;
    if (!userId) { res.status(401).json(new ApiError(401, 'Unauthorized')); return; }

    const deleted = await Integration.findOneAndDelete({ userId, provider });
    if (!deleted) {
        res.status(404).json(new ApiError(404, `No connected integration found for ${provider}`));
        return;
    }

    res.status(200).json(new ApiResponse(200, { provider }, 'Integration disconnected'));
};

export const getItems = async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId;
    if (!userId) { res.status(401).json(new ApiError(401, 'Unauthorized')); return; }

    const integrations = await Integration.find({ userId, status: 'active' });

    const results = await Promise.all(
        integrations.map(async (integration) => {
            const adapter = getAdapter(integration.provider);
            if (!adapter) return { provider: integration.provider, items: [], error: 'no adapter registered' };

            try {
                const accessToken = await resolveAccessToken(integration);
                const items = await adapter.fetchItems(accessToken);
                return { provider: integration.provider, items, error: null };
            } catch (err) {
                console.error(`[getItems] ${integration.provider} fetch failed:`, err);
                return {
                    provider: integration.provider,
                    items: [],
                    error: err instanceof Error ? err.message : 'unknown error',
                };
            }
        })
    );

    const items = results.flatMap(r => r.items);
    const errors = results.filter(r => r.error).map(r => ({ provider: r.provider, error: r.error }));

    res.status(200).json(new ApiResponse(200, { items, errors }, 'Integration items fetched successfully'));
};
```

Why `{ items, errors }` and not a plain array: one revoked provider (say Gmail) should not hide the other provider's items. The frontend can show a small "reconnect Gmail" hint using `errors` instead of a silently empty feed.

### E.2 Route wiring

Edit `server/src/modules/integration/integration.routes.ts`:

```ts
import { Router } from 'express';
import authMiddleware from '../../middleware/auth.middleware.ts';
import { apiLimiter } from '../../middleware/rateLimit.middleware.ts';
import { gateIntegrations } from '../../middleware/featureGate.middleware.ts';
import {
    connectProvider,
    callbackProvider,
    listIntegrations,
    disconnectProvider,
    getItems,
} from './integration.controller.ts';

const router = Router();

router.use(authMiddleware);
router.use(gateIntegrations);
router.use(apiLimiter);

router.get('/auth/:provider', connectProvider);
router.get('/auth/:provider/callback', callbackProvider);

router.get('/', listIntegrations);
router.delete('/:provider', disconnectProvider);

router.get('/items', getItems);

export default router;
```

`GET /items` and `DELETE /:provider` do not collide, Express matches on method and path together. Every route already passes through `gateIntegrations`, so free plan users get a `403` on all of these, not just the OAuth routes, consistent with `PLAN_LIMITS` treating integrations as one Pro only feature.

Optional later: pagination (`?limit=`/`?cursor=`), and caching the aggregated result in Redis for 60 to 120 seconds per user (an `ioredis` client already exists in `rateLimit.middleware.ts`).

### E.3 Verify

```bash
curl http://localhost:8000/api/v1/integrations -H "Authorization: Bearer <JWT>"
curl http://localhost:8000/api/v1/integrations/items -H "Authorization: Bearer <JWT>"
```

First call: array of integration docs, no token fields. Second call: `{ "data": { "items": [...], "errors": [...] } }`.

***

## Phase F: Frontend wiring

The client currently has no real API calls at all, `useStore.ts` seeds from `mockData.ts`. This is the client's first real integration.

- [ ] Create `client/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`.
- [ ] Connect buttons must do a full page redirect, not `fetch` (the route returns a 302 to a page you don't control):

```tsx
function connectIntegration(provider: 'github' | 'gmail') {
  window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/auth/${provider}`;
}
```

  Note: a plain browser navigation cannot send an `Authorization` header. `connectProvider` needs `req.userId`, so add a cookie based session fallback (simplest for local dev) so `authMiddleware` can read identity from a cookie when no bearer header is present.

- [ ] On the dashboard mount, read `?integration_success=` / `?integration_error=` query params, show a toast/log, then `router.replace('/dashboard')` to strip them (do not use `push`, or the back button gets stuck cycling the params).

- [ ] Backend model gap: `client/types/index.ts`'s `Task` has `source`/`sourceData`, but `server/src/modules/planner/task.model.ts` has neither, and the field is called `taskDescription`, not `title`. Add three optional fields to `ITask` and its schema:

```ts
source?: 'github' | 'gmail' | 'notion';   // new
externalId?: string;                       // new
link?: string;                              // new
```

  Then pass them through in `createTask` (`server/src/modules/planner/planner.controller.ts`) alongside the existing fields, all additive, no breaking change.

- [ ] Add a small typed client, `client/lib/api.ts`, wrapping `fetchIntegrationItems`, `fetchConnectedIntegrations`, and `disconnectIntegration` (each a plain `fetch` with an `Authorization` header hitting the three Phase E endpoints).

- [ ] `UniversalTask` is leaner than the mock shapes (`GitHubIssue` has `labels`/`assignees`/`body`, `UniversalTask` does not). Two honest options: (a) simple, build one generic `UniversalTaskCard` that renders title/status/link and swap it in, recommended to start; (b) full fidelity, widen `UniversalTask` with optional provider specific fields and keep the existing rich cards. Either way, feed results into the store via a new `setIntegrationItems` action that replaces the mock arrays.

- [ ] Wire the kanban drop handler (`handleDragEnd` in `DashboardLayout.tsx`): instead of only calling the local `addTask`, `POST /api/v1/planner/tasks/:channel` first with `taskDescription`, `source`, `externalId`, `link`, then call `addTask` on success so the store mirrors MongoDB rather than being an independent source of truth. Note the kanban board's "columns" are dates while the backend's "channel" is a project name (`work`, `personal`); decide how those map (this guide does not make that call for you).

- [ ] Add a small connected/disconnect UI (e.g. in `IntegrationDetailModal.tsx`) using `fetchConnectedIntegrations` and `disconnectIntegration` to show "Connected as X" plus a Disconnect button, or a Connect button if not yet linked.

Verify: run both apps, log in, click Connect GitHub, land back on `/dashboard?integration_success=github`, confirm `GET /integrations/items` fires and returns real issues, confirm the panel shows real titles, drag a card and check MongoDB for a new `tasks` doc with `source: 'github'`.

***

## Phase G: Notion (roadmap)

`integration.model.ts` already allows `'notion'` in its enum, no DB changes needed. The pattern is identical to GitHub/Gmail, just repeated.

- [ ] Create a **Public** integration at `notion.so/my-integrations` (must be public to get OAuth client id/secret; internal integrations use a static token, no OAuth).
- [ ] Redirect URI: `http://localhost:8000/api/v1/integrations/auth/notion/callback`.
- [ ] Add `NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET` to `.env` and to the Zod schema in `env.ts`.
- [ ] Notion's token exchange uses HTTP Basic auth (`client_id:client_secret` base64 in the Authorization header), not a JSON body like GitHub/Google. Add an `authStyle: 'body' | 'basic'` flag to `OAuthProviderConfig` and branch on it in `callbackProvider`, or handle Notion as a special case.
- [ ] Config entry:

```ts
notion: {
    clientId: env.NOTION_CLIENT_ID,
    clientSecret: env.NOTION_CLIENT_SECRET,
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scope: '', // Notion grants access per page at consent time, no scopes
    params: { owner: 'user' },
},
```

- [ ] Adapter: POST `https://api.notion.com/v1/search` (header `Notion-Version: 2022-06-28`), filter `object: page`, map each result's `properties` title into `UniversalTask` with `type: 'issue'` (Notion pages do not map cleanly to issue/pr/email) and `provider: 'notion'`. Requires widening `UniversalTask['provider']` to include `'notion'`.
- [ ] Register in `adapters/registry.ts`: `notion: new NotionAdapter()`.
- [ ] Frontend `NotionCard.tsx` and the `notion` branch of `handleDragEnd` already exist against mock data; repeat the Phase F card mapping decision (simple vs full fidelity) for Notion.

***

## Phase H: Test checklist and troubleshooting

### Checklist

- [ ] `bun run build` (tsc type check) passes with no errors in `server`.
- [ ] Server boots without a Zod error (confirms `.env` is complete, `ENCRYPTION_KEY` is 32 chars).
- [ ] `GET /api/v1/integrations/auth/github` returns `302` to `github.com`.
- [ ] `GET /api/v1/integrations/auth/gmail` returns `302` to `accounts.google.com`.
- [ ] GitHub consent completes, redirects to `?integration_success=github`, new `Integration` doc with `provider: 'github'`, encrypted `accessToken`, `status: 'active'`.
- [ ] Google consent completes, redirects to `?integration_success=gmail`, doc has `provider: 'gmail'` (not `'google'`) plus a non-empty `refreshToken`.
- [ ] `GET /api/v1/integrations` returns both providers, no token fields.
- [ ] `GET /api/v1/integrations/items` returns mixed `type: 'issue' | 'pr'` (GitHub) and `type: 'email'` (Gmail).
- [ ] Frontend panel shows real titles, not `mockData.ts` strings.
- [ ] Dragging a card creates a real `Task` doc with `source` and `externalId` populated.
- [ ] `DELETE /api/v1/integrations/github` removes the doc; a follow up `GET /items` no longer includes GitHub.
- [ ] After Gmail's access token expires (or manually set `expiresAt` to the past), `GET /items` still succeeds via transparent refresh in `resolveAccessToken`.

### Troubleshooting

| Symptom | Cause | Fix |
|-|-|-|
| `ValidationError: provider is not a valid enum value` | Something still writes `'google'` instead of `'gmail'` | Confirm `oauth.config.ts` key is `gmail`; check for stale builds or leftover references to `'google'` |
| Google returns `redirect_uri_mismatch` | Registered redirect URI does not byte match the callback URL | In Google Cloud Console, set the URI to exactly `http://localhost:8000/api/v1/integrations/auth/gmail/callback` |
| Gmail refresh fails with `invalid_grant` | Refresh token revoked, never issued, or expired (Testing mode tokens expire after 7 days) | User must reconnect; `resolveAccessToken` already marks `status: 'revoked'`, surface that in the UI |
| `ENCRYPTION_KEY must be exactly 32 characters` on boot | Env value is the wrong length | Count characters; regenerate with `node -p "require('crypto').randomBytes(16).toString('hex')"` |
| CORS errors calling `/integrations/items` | `FRONTEND_URL` in `server/.env` does not match the client's actual origin | Set `FRONTEND_URL` to match, e.g. `http://localhost:3000` |
| `401 Unauthorized` clicking Connect in the browser | Plain navigation cannot send an `Authorization` header | Add the cookie based auth fallback from Phase F; works fine via `curl -H "Authorization: ..."` in the meantime |
| `403 Upgrade to Pro to use integrations` | `gateIntegrations` blocking a free plan user, working as designed | Use a `plan: 'pro'` test user or one with an active trial |

***

You now have: a fixed OAuth flow, an adapter layer with `UniversalTask` normalization, three new endpoints, a frontend that fetches real data instead of mocks, and real tasks written to MongoDB on drop. Notion follows the same seams whenever you are ready to add it.
