# Building the Zenith Integrations Feature: A Complete Hand Built Guide

Welcome. This guide walks you, step by step, through building the "integrations" feature of Zenith with your own hands. By the end you will have GitHub and Gmail connected via OAuth, a working adapter layer that normalizes external data into a single shape, new API endpoints that serve that data, and a frontend that replaces its mock arrays with real data, all the way down to dragging a GitHub issue onto the kanban board and having it become a real task in MongoDB.

This is not a copy paste exercise where you blindly follow commands. Every step explains *why* the code is shaped the way it is, because the fastest way to get lost in an OAuth integration is to not understand the flow underneath it.

Zenith today is:

* `server`: a Bun + Express 5 + MongoDB monolith at `/mnt/a/Codebase/Zenith/server`
* `client`: a Next.js 16 + React 19 frontend at `/mnt/a/Codebase/Zenith/client`

And today, only the OAuth "connect" handshake exists. A user can click connect, get redirected to GitHub or Google, grant access, and Zenith will store an encrypted token in MongoDB. Nothing ever reads that token again. This guide closes that gap.

***

## Table of contents

* [Part A: Understand the architecture](#part-a-understand-the-architecture)
* [Part B: OAuth provider setup (external)](#part-b-oauth-provider-setup-external)
* [Part C: Backend, understand and fix what exists](#part-c-backend-understand-and-fix-what-exists)
* [Part D: Backend, build the adapter layer](#part-d-backend-build-the-adapter-layer)
* [Part E: Backend, new endpoints](#part-e-backend-new-endpoints)
* [Part F: Frontend, wire it up](#part-f-frontend-wire-it-up)
* [Part G: Add Notion (roadmap)](#part-g-add-notion-roadmap)
* [Part H: End to end test checklist and troubleshooting](#part-h-end-to-end-test-checklist-and-troubleshooting)

***

## Part A: Understand the architecture

Before touching any code, hold the whole picture in your head. There are seven links in this chain, and if any one of them is broken the feature "doesn't work" in a way that is hard to debug unless you know which link to check first.

1. **OAuth connect**: the user clicks a "Connect GitHub" button in the UI. The browser is sent (a full page redirect, not a fetch call) to `GET /api/v1/integrations/auth/:provider`.
2. **Provider consent**: GitHub or Google shows their own consent screen, the user approves, and the provider redirects the browser back to our callback URL with a `code`.
3. **Encrypted token storage**: our callback exchanges that `code` for an `access_token` (and sometimes a `refresh_token`), encrypts both with AES, and saves them on an `Integration` document in MongoDB, one per user per provider.
4. **Adapter fetch**: when the frontend later asks for integration items, the backend looks up the user's stored `Integration` docs, decrypts the token, and hands it to a small adapter class that knows how to talk to that specific provider's REST API.
5. **Normalize to `UniversalTask`**: every adapter, regardless of provider, returns the same shape: `{ externalId, title, link, status, type, provider }`. This is the single most important idea in this feature. The rest of the app never needs to know the difference between a GitHub issue and a Gmail message once it has been normalized.
6. **Serve to frontend**: a new endpoint, `GET /integrations/items`, aggregates `UniversalTask[]` across every provider the user has connected and returns it as one flat array.
7. **Render + drag to kanban**: the frontend's `IntegrationPanel` renders these as cards. Dragging a card onto a kanban column currently only updates local Zustand state (fake). We will make it call `POST /api/v1/planner/tasks/:channel` so a real `Task` document gets created in MongoDB, with a reference back to the `UniversalTask` it came from.

Here is that flow as a diagram. Keep this in mind as your mental map for the rest of the guide.

```
 STEP 1: CONNECT                          STEP 2: CALLBACK
 ────────────────                          ─────────────────
 Browser                                    Browser
   |  GET /api/v1/integrations/auth/:provider |  GET /api/v1/integrations/auth/:provider/callback?code=...&state=...
   v                                            ^
 connectProvider()                              |
   |  redirect to provider's consent screen     |  provider redirects back with a code
   v                                            |
 GitHub / Google consent screen  ───────────────+
   (user clicks "Authorize")

 callbackProvider() then:
   1. verifies the encrypted CSRF "state" param
   2. POSTs the code to the provider's token endpoint, gets access_token (+ refresh_token)
   3. AES encrypts both tokens
   4. upserts an Integration doc in MongoDB: { userId, provider, accessToken, refreshToken, status }
   5. redirects the browser to /dashboard?integration_success=<provider>


 STEP 3: FETCH + NORMALIZE                            STEP 4: RENDER + USE
 ──────────────────────────                            ─────────────────────
 Browser                                                IntegrationPanel.tsx
   |  GET /api/v1/integrations/items                      |  renders UniversalTask[] as cards
   v                                                       |
 getItems() controller                                     |  user drags a card onto a kanban column
   |  find all Integration docs for this user               v
   |  for each: decrypt token, refresh if expired         POST /api/v1/planner/tasks/:channel
   |  pass token to the matching adapter                    { taskDescription, link, externalId, source }
   v                                                          |
 GitHubAdapter.fetchItems() ──▶ GitHub REST API               v
 GmailAdapter.fetchItems()  ──▶ Gmail API                  a real Task document in MongoDB
   |
   v
 both return UniversalTask[] (same shape)
   |
   v
 flattened array returned as JSON ──▶ back to Browser
```

Every part below builds one link of this chain, in the order you'd naturally build it: fix the foundation first (Part C), build the piece that does the real work (Part D), expose it over HTTP (Part E), then wire the UI to it (Part F).

***

## Part B: OAuth provider setup (external)

You cannot write a single line of adapter code until you have real OAuth credentials, because both GitHub and Google refuse to redirect back to your app unless the redirect URL is pre-registered. Do this part first, even though it happens outside your editor.

### B.1 Create a GitHub OAuth App

1. Go to GitHub and open **Settings > Developer settings > OAuth Apps > New OAuth App**. (Direct URL: `https://github.com/settings/developers`.)
2. Fill in the form:
   * **Application name**: `Zenith (local dev)` or anything recognizable.
   * **Homepage URL**: `http://localhost:3000`
   * **Authorization callback URL**: `http://localhost:8000/api/v1/integrations/auth/github/callback`

     This must match, character for character, what `integration.controller.ts` builds at connect time: `${env.API_BASE_URL}/api/v1/integrations/auth/${providerStr}/callback`. With the defaults in `.env.example`, `API_BASE_URL` is `http://localhost:8000`, so the callback path above is exactly right.
3. Click **Register application**.
4. On the app's page, copy the **Client ID**. Click **Generate a new client secret** and copy that too. GitHub only shows the secret once, so paste it somewhere safe immediately.
5. Scopes are not configured on the GitHub app itself, they are requested at connect time. `server/src/modules/integration/oauth.config.ts` already requests `repo user notifications`, which is enough to read issues, pull requests, and the user's profile.

### B.2 Create a Google Cloud project and enable the Gmail API

Google's setup has more steps because Google separates "the project", "the API you're allowed to call", and "the OAuth client" into three different screens.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project (or reuse one), for example `zenith-dev`.
2. Enable the Gmail API: **APIs & Services > Library**, search for "Gmail API", click it, click **Enable**.
3. Configure the OAuth consent screen: **APIs & Services > OAuth consent screen**.
   * User type: **External** (unless you have a Google Workspace org you want to restrict this to).
   * Fill in the app name, your support email, and developer contact email.
   * Under **Scopes**, add `https://www.googleapis.com/auth/gmail.readonly`. This matches exactly what `oauth.config.ts` requests, read only access to Gmail, no ability to send or delete mail.
   * Under **Test users** (while the app is in "Testing" publish status), add your own Google account's email. Google will refuse to let unlisted accounts complete the consent flow until you either add them as test users or publish the app.
4. Create credentials: **APIs & Services > Credentials > Create Credentials > OAuth client ID**.
   * Application type: **Web application**.
   * Name: `Zenith (local dev)`.
   * **Authorized redirect URIs**: add `http://localhost:8000/api/v1/integrations/auth/gmail/callback`.

     Note this says `gmail`, not `google`. That is intentional, and Part C explains exactly why: the codebase has a naming bug where the OAuth config calls this provider `google` but the database only accepts `gmail`. You are about to fix that, and once fixed, the connect URL for Google will be `/auth/gmail`, not `/auth/google`. If you set up the Google credential before reading Part C, come back and update this redirect URI afterward.
5. Click **Create**, then copy the **Client ID** and **Client secret**.

Two details in `oauth.config.ts` matter for why Google works differently from GitHub:

```ts
google: {
    ...
    params: {
        access_type: 'offline',   // ensures we get a refresh token
        prompt: 'consent',        // forces consent screen so refresh token is always returned
    },
},
```

Google access tokens expire in about an hour. Without `access_type: offline`, Google will not issue a `refresh_token` at all, and you'd have to send the user through the consent screen again every hour. `prompt: consent` is there because Google only issues a refresh token on the *first* authorization for a given user and client; if you connected once already without offline access, silently re-authorizing will not retroactively grant a refresh token; forcing the consent prompt guarantees you get one every time. You will use this refresh token in Part D when building the Gmail adapter.

### B.3 Fill in your `.env`

Copy `server/.env.example` to `server/.env` if you have not already, then fill in the real values:

```bash
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>

GITHUB_CLIENT_ID=<from GitHub OAuth App>
GITHUB_CLIENT_SECRET=<from GitHub OAuth App>

ENCRYPTION_KEY=<any string, but it must be EXACTLY 32 characters>
```

That last one is not a suggestion. Look at `server/src/config/env.ts`:

```ts
ENCRYPTION_KEY: z.string().length(32, 'ENCRYPTION_KEY must be exactly 32 characters'),
```

Zod validates this at process startup and the server will refuse to boot if it is not exactly 32 characters. `server/src/utils/crypto.ts` uses this key for AES encryption of every access and refresh token, so it needs to be a real secret, not the placeholder `12345678901234567890123456789012` from `.env.example`, if you intend to run this anywhere other than your own machine. For local development the placeholder is fine, it is already 32 characters.

A quick way to generate a real 32 character key from your terminal:

```bash
node -p "require('crypto').randomBytes(16).toString('hex')"
```

That produces a 32 character hex string.

### B.4 Notion (you'll set this up in Part G)

You do not need Notion credentials yet. `integration.model.ts` already reserves `'notion'` as a valid provider value, and `oauth.config.ts` has a comment `// notion: {} - coming soon`, so the codebase was clearly planned with Notion in mind from day one. Part G walks through the Notion specific setup (Notion's OAuth integration page, and its slightly different token exchange, which uses HTTP Basic auth instead of a JSON body) once GitHub and Gmail are working end to end.

***

## Part C: Backend, understand and fix what exists

### C.1 Read the existing flow first

Open `server/src/modules/integration/integration.controller.ts`. There are exactly two functions in it today, and they are the entire OAuth flow:

**`connectProvider`** (step 1): reads `:provider` from the URL, looks up its config in `OAUTH_CONFIG`, builds a `state` parameter, and redirects.

The `state` parameter deserves attention because it is the app's CSRF defense for the whole OAuth dance:

```ts
const statePayload = JSON.stringify({ u: userId, e: Date.now() + 10 * 60 * 1000 });
const state = encryptData(statePayload, env.ENCRYPTION_KEY);
```

It is an AES encrypted JSON blob containing the logged in user's id (`u`) and an expiry timestamp (`e`), ten minutes out. Because it is encrypted with a server side secret, an attacker cannot forge a valid `state` value, and because it is round tripped through the OAuth provider unchanged, when it comes back in the callback we know it really was *this* server that initiated the flow for *this* user, not some other site tricking the browser into linking its own GitHub account to your Zenith account. This is a textbook CSRF mitigation for OAuth flows and you should keep this pattern exactly as is; do not simplify it away.

**`callbackProvider`** (step 2): decrypts and validates that `state`, exchanges the `code` for tokens, encrypts the tokens, and upserts an `Integration` document:

```ts
await Integration.findOneAndUpdate(
    { userId, provider: providerStr2 },
    {
        userId,
        provider: providerStr2,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        profile: { username: 'connected', avatar: '' },
        expiresAt: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000)
            : undefined,
        status: 'active',
    },
    { upsert: true, new: true }
);
```

`providerStr2` here is whatever string was in the URL, taken straight from `req.params.provider`. That is the seed of the bug you are about to fix.

### C.2 The bug: `'google'` versus `'gmail'`

Open `server/src/modules/integration/oauth.config.ts` and `server/src/modules/integration/integration.model.ts` side by side.

`oauth.config.ts` keys its Google entry as `google`:

```ts
export const OAUTH_CONFIG: Record<string, OAuthProviderConfig> = {
    google: { ... },
    github: { ... },
};
```

`integration.model.ts` defines the provider enum as:

```ts
type Provider = 'github' | 'gmail' | 'notion';
...
provider: { type: String, enum: ['github', 'gmail', 'notion'], required: true },
```

There is no `'google'` in that enum. Now trace what happens when a user connects their Google account: the browser hits `GET /api/v1/integrations/auth/google`, `connectProvider` reads `provider = 'google'` from the URL, looks it up in `OAUTH_CONFIG['google']`, finds it, and redirects successfully. The user approves. Google redirects back to `/api/v1/integrations/auth/google/callback`. `callbackProvider` exchanges the code for a token successfully. Then it calls:

```ts
await Integration.findOneAndUpdate(
    { userId, provider: 'google' },
    { ..., provider: 'google', ... },
    { upsert: true, new: true }
);
```

Mongoose validates `provider: 'google'` against the schema's enum `['github', 'gmail', 'notion']`, finds no match, and throws a `ValidationError`. That throw is caught by the `try/catch` in `callbackProvider`, which logs `[OAuth] google callback error:` and redirects the browser to `/dashboard?integration_error=server_error`. The user sees a generic failure with no indication of what actually went wrong, and Google integration is permanently broken until this is fixed, no matter how correct your client ID and secret are.

### C.3 The fix

There are two ways to reconcile this: add a mapping layer that translates `'google'` to `'gmail'` right before the database write, or simply rename the config key so the mismatch never exists in the first place. The second option is simpler, requires touching fewer lines, and matches how the rest of the app already refers to this integration. Check `client/types/index.ts`:

```ts
export type IntegrationType = 'github' | 'gmail' | 'notion' | null;
```

The frontend never says `'google'` anywhere, it says `'gmail'` (see `RightSidebar.tsx`'s integration list: `{ id: 'gmail', icon: Mail, label: 'Gmail' }`). So the cleanest fix is to make the backend agree with that vocabulary end to end: the provider is called `gmail` everywhere outside of the literal OAuth URLs that belong to Google.

Open `server/src/modules/integration/oauth.config.ts` and rename the key:

```ts
export const OAUTH_CONFIG: Record<string, OAuthProviderConfig> = {
    gmail: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        // Read-only Gmail access is enough for Zenith's integration panel
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        params: {
            access_type: 'offline',   // ensures we get a refresh token
            prompt: 'consent',        // forces consent screen so refresh token is always returned
        },
    },
    github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scope: 'repo user notifications',
    },
    // notion: {} (added in Part G)
};
```

Nothing else in `integration.controller.ts` needs to change. `connectProvider` and `callbackProvider` both just read `req.params.provider` and use it as the `OAUTH_CONFIG` lookup key *and* as the value stored in Mongo, so as long as the config key and the enum agree, the whole flow works unmodified. The user visible connect link becomes `GET /api/v1/integrations/auth/gmail`, and the OAuth callback becomes `/api/v1/integrations/auth/gmail/callback`, which is exactly the redirect URI you registered in the Google Cloud Console back in Part B.2.

Do not forget to double check that redirect URI now. If you created the Google OAuth client before this rename, go back to the Google Cloud Console and make sure the registered redirect URI reads `http://localhost:8000/api/v1/integrations/auth/gmail/callback`, not `.../auth/google/callback`. A mismatch here causes Google to reject the callback with `redirect_uri_mismatch`, which is one of the errors in the troubleshooting table in Part H.

### C.4 Verify it works

With the rename in place and your `.env` filled in from Part B, start the server:

```bash
cd /mnt/a/Codebase/Zenith/server
bun run dev
```

You need a logged in user with a JWT (use the existing `/api/v1/auth` routes to register and log in, this guide assumes auth already works since it is outside the scope of the integrations feature). With that JWT, open a browser tab (not curl, since this route issues a redirect meant for a real browser) at:

```
http://localhost:8000/api/v1/integrations/auth/github
```

Because `authMiddleware` reads the JWT from an `Authorization` header rather than a cookie, you cannot literally paste this URL into an address bar and expect it to authenticate; Part F wires up the real click through flow. For now, the quickest manual check is:

```bash
curl -i http://localhost:8000/api/v1/integrations/auth/github \
  -H "Authorization: Bearer <your JWT>"
```

You should see a `302` response with a `Location` header pointing at `https://github.com/login/oauth/authorize?...`. Do the same for `gmail` and confirm the `Location` points at `https://accounts.google.com/o/oauth2/v2/auth?...`. If both redirect successfully, `connectProvider` and the config rename are correct. The full callback round trip is easiest to test from the browser once Part F is wired up, since it requires actually clicking "Authorize" on GitHub or Google's own page.

***

## Part D: Backend, build the adapter layer

This is the core of the feature: the part that actually does something with the tokens you have been storing. Everything before this point only proved you *can* get a token. Now you use it.

### D.1 Why an adapter interface

GitHub's API, Gmail's API, and eventually Notion's API all return wildly different JSON shapes. If the rest of the app (the `/integrations/items` endpoint, the frontend cards, the "drag onto kanban" handler) had to know about all three shapes, every new integration you add would require touching every one of those places. Instead, every provider gets one small class whose only job is: take an access token in, return an array of one common shape out. That common shape is called `UniversalTask`, and it comes directly from the design already sketched out in `services/integration-service/README.md`:

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
    fetchItems(): Promise<UniversalTask[]>;
}
```

We will use this as our north star with one small, deliberate change: `fetchItems` takes the decrypted access token as a parameter, `fetchItems(accessToken: string)`, rather than looking it up itself. This keeps the adapter a pure function of "token in, tasks out" with zero knowledge of MongoDB, encryption, or which user it is running for. That separation matters because Gmail access tokens expire and need refreshing before the adapter ever sees them; keeping that concern out of the adapter means the adapter never has to know how to talk to Mongo or update a stored refresh token, it just consumes whatever valid token it is handed.

### D.2 Set up the folder

Create a new `adapters` folder inside the integration module:

```bash
mkdir -p /mnt/a/Codebase/Zenith/server/src/modules/integration/adapters
```

### D.3 Define the shared types

Create `server/src/modules/integration/adapters/types.ts`:

```ts
// UniversalTask is the single normalized shape every provider adapter
// must return. Nothing outside this adapters/ folder should ever see
// raw GitHub or Gmail API responses; everything downstream (the
// /integrations/items endpoint, the frontend cards, task creation)
// only ever deals with UniversalTask.

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

### D.4 Build the GitHub adapter

GitHub has one endpoint that conveniently returns both issues *and* pull requests: `GET https://api.github.com/issues`. This works because in GitHub's data model, every pull request *is* an issue with extra fields attached; the way you tell them apart in the response is whether the object has a `pull_request` key.

Create `server/src/modules/integration/adapters/github.adapter.ts`:

```ts
import type { IntegrationAdapter, UniversalTask } from './types.ts';

// GitHub's raw response shape, trimmed to only the fields we use.
interface GitHubIssueResponse {
    id: number;
    number: number;
    title: string;
    html_url: string;
    state: 'open' | 'closed';
    repository_url: string;
    pull_request?: { url: string; merged_at: string | null };
}

/**
 * GitHubAdapter: talks to the GitHub REST API and normalizes issues
 * and pull requests into UniversalTask[].
 *
 * GET /issues returns items assigned to (or authored by, depending on
 * `filter`) the authenticated user across every repository they can
 * see. Pull requests come back from the same endpoint; GitHub marks
 * them with a `pull_request` field so we can tell them apart from
 * plain issues.
 */
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

        if (!res.ok) {
            throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
        }

        const items = (await res.json()) as GitHubIssueResponse[];

        return items.map((item): UniversalTask => {
            const isPullRequest = Boolean(item.pull_request);
            const status = isPullRequest && item.pull_request?.merged_at
                ? 'merged'
                : item.state;

            // repository_url looks like https://api.github.com/repos/owner/name
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

A few notes on choices made here:

* `filter=assigned` scopes results to issues and PRs assigned to the connected user, not every issue in every repo they have access to (which for anyone on a busy org could be thousands). You can change this to `filter=all` if you want a broader feed, but `assigned` is the closest match to "what does this person actually need to act on", which is the point of a task feed.
* `state=all` includes closed items too, since the adapter's job is just to fetch and normalize; filtering by open/closed is a job for the endpoint or the frontend, not baked into the adapter.
* Merged status: the `/issues` list endpoint does include `pull_request.merged_at` for merged PRs, so we can distinguish `merged` from plain `closed` without an extra request per PR. This matches the `'issue' | 'pr'` type split the README's `UniversalTask` interface calls for, plus a bonus: three way status (`open`, `closed`, `merged`) instead of just two.
* We never touch `decryptData` inside the adapter itself. Decryption happens one layer up, in the controller, which is what D.6's registry and Part E's `getItems` controller are responsible for. This is deliberate: the adapter's only job is HTTP + normalization, not secrets handling.

### D.5 Build the Gmail adapter

Gmail's API is two calls per message: `messages.list` gives you IDs only, `messages.get` gives you the actual headers. We only need enough information to build a task card (subject, sender, a link back to the message), so we ask for `format=metadata` and only the `Subject` header, which keeps each `get` call cheap.

Gmail access tokens are short lived (about one hour). Rather than have the adapter itself deal with refreshing (which would require it to reach into MongoDB, breaking the "pure token in, tasks out" design from D.1), refreshing happens one layer up, in a small token service that the controller calls before invoking any adapter. Build that service first.

Create `server/src/modules/integration/token.service.ts`:

```ts
import { env } from '../../config/env.ts';
import { encryptData, decryptData } from '../../utils/crypto.ts';
import { Integration } from './integration.model.ts';
import type { HydratedDocument } from 'mongoose';

// Matches the shape stored on an Integration document, imported loosely
// here to avoid a circular type dependency with integration.model.ts.
interface IntegrationLike {
    provider: string;
    accessToken: string;
    refreshToken: string;
    expiresAt?: Date;
}

/**
 * resolveAccessToken: returns a decrypted, *guaranteed valid* access
 * token for the given Integration document.
 *
 * For GitHub, tokens issued by GitHub OAuth Apps do not expire, so this
 * just decrypts and returns.
 *
 * For Gmail, the token can be up to an hour old. If `expiresAt` has
 * passed (or is missing, to be safe), we use the stored refresh token
 * to get a new access token from Google, persist the new encrypted
 * token + expiry back onto the document, and return the fresh token.
 */
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
        // (e.g. the user disconnected the app from their Google account).
        // Mark the integration as revoked so the UI can prompt reconnect.
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

Now the adapter itself can stay simple, exactly matching the `fetchItems(accessToken)` contract. Create `server/src/modules/integration/adapters/gmail.adapter.ts`:

```ts
import type { IntegrationAdapter, UniversalTask } from './types.ts';

interface GmailListResponse {
    messages?: { id: string; threadId: string }[];
}

interface GmailMessageResponse {
    id: string;
    labelIds?: string[];
    payload?: {
        headers?: { name: string; value: string }[];
    };
}

function getHeader(message: GmailMessageResponse, name: string): string {
    return message.payload?.headers?.find(h => h.name === name)?.value ?? '(no subject)';
}

/**
 * GmailAdapter: talks to the Gmail API and normalizes messages into
 * UniversalTask[]. Only reads metadata (Subject header), never the
 * message body, matching the gmail.readonly scope requested in
 * oauth.config.ts.
 */
export class GmailAdapter implements IntegrationAdapter {
    async fetchItems(accessToken: string): Promise<UniversalTask[]> {
        const listRes = await fetch(
            'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=in:inbox',
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!listRes.ok) {
            throw new Error(`Gmail API error: ${listRes.status} ${listRes.statusText}`);
        }

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

Note the `Promise.all` over individual `messages.get` calls. Gmail's list endpoint genuinely does not return subject lines, only IDs, so this fan out is unavoidable with the plain `fetch` approach. If you later find yourself pulling hundreds of messages, consider Gmail's [`batch` endpoint](https://developers.google.com/gmail/api/guides/batch) to collapse these into fewer HTTP round trips; for a task feed showing 20 recent messages, the current approach is simple and fast enough.

### D.6 The registry

The controller layer (Part E) needs a way to go from a provider string (`'github'`, `'gmail'`) to the right adapter instance, without an `if/else` chain scattered across multiple files. Create `server/src/modules/integration/adapters/registry.ts`:

```ts
import type { IntegrationAdapter } from './types.ts';
import { GitHubAdapter } from './github.adapter.ts';
import { GmailAdapter } from './gmail.adapter.ts';

// Add new providers here and nowhere else (see Part G for Notion).
const ADAPTER_REGISTRY: Record<string, IntegrationAdapter> = {
    github: new GitHubAdapter(),
    gmail: new GmailAdapter(),
};

export function getAdapter(provider: string): IntegrationAdapter | undefined {
    return ADAPTER_REGISTRY[provider];
}
```

This mirrors the comment already sitting at the top of `oauth.config.ts`: *"To add a new provider: add a new entry here, no controller changes needed."* The registry follows the same philosophy for the fetch side of the feature.

### D.7 Verify it works

You cannot easily unit test these adapters without a real token, but you can sanity check them once a real `Integration` document exists (after completing the OAuth flow in Part F). For now, verify the code compiles and the types line up:

```bash
cd /mnt/a/Codebase/Zenith/server
bun run build
```

You will wire these adapters into an actual endpoint in the next part, which is where you will get your first real, visible proof they work.

***

## Part E: Backend, new endpoints

With OAuth fixed and the adapter layer built, you need three new endpoints:

* `GET /integrations`: list the current user's connected integrations, no secrets included.
* `DELETE /integrations/:provider`: disconnect a provider (deletes the stored tokens).
* `GET /integrations/items`: aggregate `UniversalTask[]` across every connected provider.

### E.1 Add the controller functions

Open `server/src/modules/integration/integration.controller.ts` and add these three functions, alongside the existing `connectProvider` and `callbackProvider`. They follow the same conventions already used in this file and elsewhere in the codebase: `async (req, res): Promise<void>`, `ApiError` for failures, `ApiResponse` for successes.

```ts
import { getAdapter } from './adapters/registry.ts';
import { resolveAccessToken } from './token.service.ts';

/**
 * listIntegrations: returns the user's connected integrations without
 * ever exposing accessToken/refreshToken to the client.
 */
export const listIntegrations = async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json(new ApiError(401, 'Unauthorized'));
        return;
    }

    const integrations = await Integration.find({ userId })
        .select('-accessToken -refreshToken')
        .lean();

    res.status(200).json(new ApiResponse(200, integrations, 'Integrations fetched successfully'));
};

/**
 * disconnectProvider: deletes the stored tokens for one provider.
 * This does NOT revoke the token on GitHub/Google's side; it only
 * removes our copy. Revoking upstream is an optional future
 * enhancement (GitHub and Google both expose token revocation
 * endpoints, see Part H for notes).
 */
export const disconnectProvider = async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId;
    const { provider } = req.params;
    if (!userId) {
        res.status(401).json(new ApiError(401, 'Unauthorized'));
        return;
    }

    const deleted = await Integration.findOneAndDelete({ userId, provider });
    if (!deleted) {
        res.status(404).json(new ApiError(404, `No connected integration found for ${provider}`));
        return;
    }

    res.status(200).json(new ApiResponse(200, { provider }, 'Integration disconnected'));
};

/**
 * getItems: the aggregation endpoint. Fetches UniversalTask[] from
 * every provider the user has connected and returns them flattened
 * into one array.
 *
 * A failure in one provider (e.g. a revoked Gmail refresh token) must
 * not take down the whole feed, so each provider's fetch is isolated
 * with its own try/catch and reported separately.
 */
export const getItems = async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json(new ApiError(401, 'Unauthorized'));
        return;
    }

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

Why the response shape is `{ items, errors }` rather than just an array: if a user's Gmail refresh token was revoked, you still want their GitHub items to show up. Silently dropping the failed provider would look like a bug ("where did my Gmail cards go?"); returning it as a named error lets the frontend show a small "Gmail needs reconnecting" hint instead (see Part F.5).

### E.2 Wire up the routes

Open `server/src/modules/integration/integration.routes.ts` and add the three routes. Keep the existing middleware chain (`authMiddleware`, `gateIntegrations`, `apiLimiter`) exactly as it already applies to the whole router via `router.use(...)`, so nothing new needs to be added per route:

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

// ─── OAuth flow ────────────────────────────────────────────────────────────────
router.get('/auth/:provider', connectProvider);
router.get('/auth/:provider/callback', callbackProvider);

// ─── Connected integrations ────────────────────────────────────────────────────
router.get('/', listIntegrations);
router.delete('/:provider', disconnectProvider);

// ─── Aggregated items ──────────────────────────────────────────────────────────
router.get('/items', getItems);

export default router;
```

Route ordering note: `GET /items` and `DELETE /:provider` do not collide even though `/:provider` looks like it could match `/items`, because Express matches on method *and* path together; a `GET /items` request only ever considers `router.get(...)` handlers, so `router.get('/items', getItems)` is checked and matched before Express would even look at the unrelated `router.delete('/:provider', ...)` handler.

Since every route on this router already passes through `gateIntegrations`, free plan users get a `403` on `GET /integrations` and `GET /integrations/items` too, not just the OAuth routes. That is consistent with how `PLAN_LIMITS` in `server/src/config/planLimits.ts` frames `integrations` as a single Pro-only feature flag, so leave this as is rather than special casing the read-only routes.

### E.3 Optional enhancements (not required to ship this)

* **Pagination**: `GET /integrations/items` currently pulls the same fixed page size from every provider (30 GitHub issues, 20 Gmail messages) on every request. If your task feed grows, add `?limit=` and `?cursor=` query params and thread them into each adapter's `fetchItems`.
* **Caching**: every call to `/integrations/items` currently re-fetches from GitHub and Gmail live. GitHub's REST API allows 5,000 requests/hour per authenticated user, Gmail's default quota is generous but not infinite; for a production app, cache the aggregated result in Redis (already a dependency, see `rateLimit.middleware.ts` for the existing `ioredis` client) for 60 to 120 seconds per user, so rapid UI refreshes do not each trigger a new round trip to two external APIs.

### E.4 Verify it works

Restart the server, then, with a valid JWT and at least one connected integration (complete Part F first if you have not connected anything yet, or manually insert a test `Integration` document), hit:

```bash
curl http://localhost:8000/api/v1/integrations \
  -H "Authorization: Bearer <your JWT>"
```

You should get back a JSON array of integration docs with no `accessToken` or `refreshToken` fields present. Then:

```bash
curl http://localhost:8000/api/v1/integrations/items \
  -H "Authorization: Bearer <your JWT>"
```

You should get back `{ "data": { "items": [...], "errors": [...] } }` where `items` is a flat array of `UniversalTask` objects mixing GitHub and Gmail entries (once both are connected). If `items` is empty and `errors` is empty too, you have no connected integrations yet; go back to Part F.

***

## Part F: Frontend, wire it up

Everything so far lives entirely in `server`. Now make the Next.js app in `client` talk to it. There is one important starting fact worth stating plainly: **the client currently makes no real API calls at all**. `client/store/useStore.ts` seeds its state straight from `client/lib/mockData.ts`, and there is no `fetch`, `axios`, or `NEXT_PUBLIC_API_URL` anywhere in the codebase yet (there is a `@tanstack/react-query` dependency already installed, but unused so far). You are about to be the one who adds the client's first real API integration.

### F.1 Add the API base URL

Create `client/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Next.js only exposes environment variables prefixed with `NEXT_PUBLIC_` to browser side code (anything without that prefix stays server side only, which matters once you use this app's own Next.js API routes or server components, but the integration panel here is a client component making a direct browser fetch, so it needs the public prefix). `.env.local` is already covered by Next.js's default `.gitignore` pattern, so this file will not accidentally get committed with machine specific values.

### F.2 Trigger connect with a full page redirect, not a fetch

This is the detail most likely to trip you up if you are used to wiring up JSON APIs: `GET /api/v1/integrations/auth/:provider` is not meant to be called with `fetch`. It returns an HTTP `302` redirect to GitHub or Google's own consent page, a page your app does not control and cannot render inside a fetch response. The browser itself has to navigate there.

Find (or add) the connect buttons, most naturally in `client/components/dashboard/RightSidebar.tsx` next to the existing integration icons, or inside `IntegrationDetailModal.tsx`/`IntegrationPanel.tsx` if you want a "Connect" call to action inside the panel when a provider has no items yet. The trigger itself is one line:

```tsx
function connectIntegration(provider: 'github' | 'gmail') {
  window.location.href =
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/auth/${provider}`;
}
```

One catch: `connectProvider` on the backend requires `authMiddleware` to have already set `req.userId`, which means it expects an `Authorization: Bearer <jwt>` header. A plain `window.location.href` navigation cannot attach custom headers, browsers do not support that for top level navigations. If Zenith's auth currently lives in an `Authorization` header (as `auth.middleware.ts` shows: `req.headers.authorization?.split(' ')[1]`), you have two practical options:

1. **Cookie based session for this one route.** Have your login flow also set an httpOnly session cookie (or a lightweight, non-httpOnly cookie holding the JWT if you accept the tradeoff) so `connectProvider`'s middleware chain can read it as a fallback when no `Authorization` header is present. This is the standard way OAuth "connect" buttons work in apps that otherwise use bearer tokens for their JSON API, because the redirect leg of an OAuth flow is fundamentally a browser navigation, not an XHR request.
2. **A short-lived signed link.** Have an authenticated `fetch` call to a small new endpoint that returns a one-time signed URL (or simply appends the JWT as a query param the server reads once), then navigate to that URL. This avoids touching cookies at all but is more moving parts for a local-first project.

For local development simplicity, option 1 (a cookie) is the least code. This guide will not modify `auth.middleware.ts` for you since that changes a shared, already-working piece of infrastructure, but note it explicitly as the one piece of plumbing you need to add before the connect button works end to end in a browser tab rather than via `curl -H "Authorization: ..."`. If your session cookie (`express-session`, already configured in `server/src/app.ts`) already carries enough identity to resolve a user, you may be able to reuse it directly here instead of the JWT path.

### F.3 Handle the callback query params on return

Look back at `callbackProvider` in `integration.controller.ts`: on success it redirects to `${env.FRONTEND_URL}/dashboard?integration_success=${providerStr2}`, on failure to `${env.FRONTEND_URL}/dashboard?integration_error=<reason>`. Your dashboard page needs to notice these query params when it mounts and show feedback (a toast, a banner, anything visible), then clean the URL so a page refresh does not re-trigger the message.

Wherever your dashboard route's top level component lives (likely `client/app/dashboard/page.tsx`), add an effect:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function useIntegrationCallbackFeedback() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const success = searchParams.get('integration_success');
    const error = searchParams.get('integration_error');

    if (success) {
      console.info(`Connected ${success} successfully.`);
      // swap this for your actual toast/notification system
    }
    if (error) {
      console.error(`Failed to connect: ${error}`);
    }

    if (success || error) {
      router.replace('/dashboard');
    }
  }, [searchParams, router]);
}
```

Call this hook once from the dashboard page component. `router.replace` (not `push`) swaps the URL without adding a new browser history entry, so the back button does not bounce the user between "?integration_success=github" and "/dashboard" forever.

### F.4 Small backend addition: linking tasks back to their source

Before wiring up the drag-to-kanban flow, look at the gap between the frontend's idea of a `Task` and the backend's. `client/types/index.ts` defines:

```ts
export interface Task {
  id: string;
  title: string;
  ...
  source?: 'github' | 'gmail' | 'notion';
  sourceData?: GitHubIssue | GmailMessage | NotionPage;
}
```

But the real backend `Task` model, `server/src/modules/planner/task.model.ts`, has no `source`, `link`, or `externalId` fields at all:

```ts
export interface ITask extends Document {
    taskDescription: string;
    userId: Types.ObjectId;
    channel: string;
    start?: Date;
    due?: Date;
    status: 'todo' | 'not_started' | 'in_progress' | 'done';
    notes?: string;
}
```

Also note the field name mismatch: the frontend calls it `title`, the backend calls it `taskDescription`. To make "drag a card onto the kanban board creates a real task that references the `UniversalTask`" actually work, extend the backend model with three small optional fields. Open `server/src/modules/planner/task.model.ts` and add:

```ts
export interface ITask extends Document {
    taskDescription: string;
    userId: Types.ObjectId;
    channel: string;
    start?: Date;
    due?: Date;
    status: 'todo' | 'not_started' | 'in_progress' | 'done';
    notes?: string;
    source?: 'github' | 'gmail' | 'notion';   // new
    externalId?: string;                       // new
    link?: string;                              // new
}

const taskSchema = new Schema<ITask>({
    taskDescription: { type: String },
    userId: { type: Schema.Types.ObjectId, required: true },
    channel: { type: String, required: true, index: true },
    status: {
        type: String,
        enum: ['todo', 'not_started', 'in_progress', 'done'],
        default: 'todo',
    },
    start: { type: Date },
    due: { type: Date },
    notes: { type: String },
    source: { type: String, enum: ['github', 'gmail', 'notion'] },   // new
    externalId: { type: String },                                    // new
    link: { type: String },                                          // new
});
```

Then update `createTask` in `server/src/modules/planner/planner.controller.ts` to accept and store them:

```ts
export const createTask = async (req: Request, res: Response): Promise<void> => {
    const { taskDescription, due, status, notes, source, externalId, link } = req.body;
    const { channel } = req.params;

    if (!taskDescription) {
        res.status(400).json(new ApiError(400, 'taskDescription is required'));
        return;
    }

    const task = new Task({
        taskDescription,
        status: status || 'todo',
        start: new Date(),
        due,
        notes,
        source,
        externalId,
        link,
        userId: req.userId,
        channel: channel || 'work',
    });
    await task.save();

    res.status(201).json(new ApiResponse(201, task, 'Task created successfully'));
};
```

This is a small, additive change (all three new fields are optional), so it does not break any existing caller of `createTask`.

### F.5 Fetch real items and replace the mock arrays

Add a small typed API client. Create `client/lib/api.ts`:

```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface UniversalTask {
  externalId: string;
  title: string;
  link: string;
  status: string;
  type: 'issue' | 'pr' | 'email';
  provider: 'github' | 'gmail';
}

interface ItemsResponse {
  items: UniversalTask[];
  errors: { provider: string; error: string }[];
}

export async function fetchIntegrationItems(token: string): Promise<ItemsResponse> {
  const res = await fetch(`${API_URL}/api/v1/integrations/items`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch integration items: ${res.status}`);
  const body = await res.json();
  return body.data as ItemsResponse;
}

export interface ConnectedIntegration {
  provider: 'github' | 'gmail' | 'notion';
  status: 'active' | 'expired' | 'revoked';
  profile: { username: string; avatar: string };
}

export async function fetchConnectedIntegrations(token: string): Promise<ConnectedIntegration[]> {
  const res = await fetch(`${API_URL}/api/v1/integrations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch integrations: ${res.status}`);
  const body = await res.json();
  return body.data as ConnectedIntegration[];
}

export async function disconnectIntegration(token: string, provider: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/integrations/${provider}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to disconnect ${provider}: ${res.status}`);
}
```

Now the card components need real data instead of mock data. `IntegrationPanel.tsx` currently reads `githubIssues`, `githubPRs`, `gmailMessages`, `notionPages` straight from the Zustand store, which is itself seeded from `mockGitHubIssues` etc. in `client/lib/mockData.ts`. `UniversalTask` from the backend does not carry every field the mock shapes have (`GitHubIssue` has `labels`, `assignees`, `body`, `repository`, none of which exist on `UniversalTask`), because those richer fields were only ever needed for the mock UI's detail modal, not for the core "here is a task you can act on" feed.

There are two honest paths here:

* **Simple path (recommended to start)**: keep `GitHubIssueCard`, `GmailCard`, etc. as they are for now, and introduce a *new*, simpler card component (or a generic `UniversalTaskCard`) that renders the `UniversalTask` shape directly: title, a status pill, a link, and a draggable handle. Swap `IntegrationPanel.tsx` to render this generic card once real items exist, and treat the richer mock cards as a "phase two" enhancement once you extend the GitHub adapter to also fetch labels and assignees (an easy follow up: GitHub's `/issues` response already includes `labels` and `assignees`, just add them to `UniversalTask` or a provider specific extension of it).
* **Full fidelity path**: extend `UniversalTask` with optional, provider specific fields (`labels?`, `assignees?`, `body?`, `repository?`) and have `GitHubAdapter.fetchItems` populate them from the same GitHub response it already fetches, no extra API calls needed. Then map the API response directly into the existing `GitHubIssue`/`GitHubPR`/`GmailMessage` shapes client side and keep every existing card component completely unchanged.

Either way, the fetch itself plugs into `useStore.ts` the same way. Add an action that replaces the mock seeded arrays with real data once fetched:

```ts
// inside useStore.ts, add to AppState:
setIntegrationItems: (items: UniversalTask[]) => void;

// inside the create<AppState>((set, get) => ({ ... })) body:
setIntegrationItems: (items) => {
  const githubIssues = items.filter(i => i.type === 'issue');
  const githubPRs = items.filter(i => i.type === 'pr');
  const gmailMessages = items.filter(i => i.type === 'email');
  // map each UniversalTask into the shape the existing cards expect,
  // or swap in the generic UniversalTaskCard from the "simple path" above
  set({ githubIssues, githubPRs, gmailMessages });
},
```

Then call `fetchIntegrationItems` and feed the result into this action, for example from the dashboard page's mount effect (the same place you handled `F.3`'s callback query params is a natural spot, since a successful connect is exactly when you want to immediately refetch items).

### F.6 Make dropping a card create a real backend task

Open `client/components/dashboard/DashboardLayout.tsx` and look at `handleDragEnd`. Today, every branch (`github-issue`, `github-pr`, `gmail`, `notion`) calls the local, mock only `addTask` action from the Zustand store, which only ever touches client state:

```tsx
if (activeData?.type === "github-issue" && overData?.type === "column") {
  const issue = activeData.issue;
  addTask({
    title: issue.title,
    duration: "1:00",
    tag: "work",
    date: overData.column.id,
    completed: false,
    source: "github",
    sourceData: issue,
  });
}
```

Change this branch (and the equivalent `github-pr`, `gmail`, `notion` branches) to call the real backend endpoint instead, using the `externalId` and `link` your `UniversalTask` shape carries:

```tsx
if (activeData?.type === "github-issue" && overData?.type === "column") {
  const issue = activeData.issue as UniversalTask;
  const channel = 'work'; // or derive from overData.column, see note below

  fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/planner/tasks/${channel}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      taskDescription: issue.title,
      source: issue.provider,
      externalId: issue.externalId,
      link: issue.link,
      due: overData.column.date,
    }),
  })
    .then(res => res.json())
    .then(body => addTask({
      title: body.data.taskDescription,
      duration: '1:00',
      tag: 'work',
      date: overData.column.id,
      completed: false,
      source: issue.provider,
    }));
}
```

A couple of things worth calling out:

* This still calls the local `addTask` too, but now *after* the real backend call succeeds, so the local Zustand store stays a client side mirror of what is actually in MongoDB, not an independent source of truth. In a fuller build out, you would prefer to refetch the task list from `GET /api/v1/planner/tasks` after a successful POST (or use `@tanstack/react-query`'s cache invalidation, since the dependency is already installed) rather than hand assembling the optimistic UI update shown above.
* `overData.column.id` is a date string (see `generateColumns()` in `useStore.ts`, which formats columns as `yyyy-MM-dd`), while the real `createTask` endpoint expects a `:channel` URL param, which in `task.model.ts` means a project name (`work`, `personal`, etc.), not a date. The kanban board's "columns" in this codebase are actually days, while the backend's "channels" are projects. Reconciling this is a genuine design decision for you to make (do dropped integration items always go into a `work` channel and use the column's date as `due`? Or does the app need a channel picker?), which is why the snippet above hardcodes `channel = 'work'` with a comment flagging it. This guide will not make that call for you, since it is a product decision about how channels and calendar days should relate, not a technical requirement of the integrations feature itself.
* `token` needs to come from wherever your app currently stores the logged in user's JWT (localStorage, a cookie, a client side auth store). This guide assumes that piece of auth plumbing already exists elsewhere in the app; if it does not yet, wiring up F.2's cookie fallback in the auth flow first will also solve this.

### F.7 A small connected and disconnect UI

Somewhere visible, most naturally the `IntegrationDetailModal.tsx` or a small settings panel, add a connected state indicator and a disconnect button per provider, using the `fetchConnectedIntegrations` and `disconnectIntegration` functions from `F.5`:

```tsx
function IntegrationStatusRow({ provider, token }: { provider: 'github' | 'gmail'; token: string }) {
  const [connected, setConnected] = useState<ConnectedIntegration | null>(null);

  useEffect(() => {
    fetchConnectedIntegrations(token).then(list => {
      setConnected(list.find(i => i.provider === provider) ?? null);
    });
  }, [token, provider]);

  if (!connected) {
    return (
      <button onClick={() => window.location.href =
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/auth/${provider}`}>
        Connect {provider}
      </button>
    );
  }

  return (
    <div>
      <span>Connected as {connected.profile.username}</span>
      <button onClick={async () => {
        await disconnectIntegration(token, provider);
        setConnected(null);
      }}>
        Disconnect
      </button>
    </div>
  );
}
```

### F.8 Verify it works

1. Run both apps: `bun run dev` in `server`, and `bun run dev` (or `npm run dev`) in `client`.
2. Log in as a test user in the browser.
3. Click your new "Connect GitHub" button. You should land on GitHub's real consent screen, approve, and land back on `/dashboard?integration_success=github`, briefly, before your F.3 handler strips the query param.
4. Check the network tab (or add a temporary `console.log`) confirming a `GET /api/v1/integrations/items` request fires and returns real GitHub issues in its `items` array.
5. Open the GitHub panel (`RightSidebar` icon) and confirm real issue titles show up, not the mock ones from `mockData.ts`.
6. Drag a card onto a kanban column, then check MongoDB directly (`mongosh`, or your GUI of choice) for a new document in the `tasks` collection with `source: 'github'` and a matching `externalId`.

***

## Part G: Add Notion (roadmap)

`integration.model.ts` already lists `'notion'` in its provider enum, so the database layer needs zero changes. This section is intentionally shorter than Parts C through F because the pattern is now fully established, you are repeating it, not inventing it.

### G.1 Register a Notion integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations) and create a **Public integration** (public, not internal, is required to get a real OAuth flow with a client id/secret and a redirect URI, since internal integrations use a static token with no OAuth dance at all).
2. Set the **Redirect URI** to `http://localhost:8000/api/v1/integrations/auth/notion/callback`.
3. Copy the **OAuth client ID** and **client secret**.
4. Add to `.env`:

```bash
NOTION_CLIENT_ID=<from Notion integration settings>
NOTION_CLIENT_SECRET=<from Notion integration settings>
```

And to `server/src/config/env.ts`'s schema:

```ts
NOTION_CLIENT_ID: z.string().min(1),
NOTION_CLIENT_SECRET: z.string().min(1),
```

### G.2 Add the config entry

Notion's OAuth differs from GitHub and Google in one meaningful way: the token exchange uses HTTP Basic auth (`client_id:client_secret` base64 encoded in the `Authorization` header) instead of putting the client secret in the JSON body. That means the shared `callbackProvider` function's generic token exchange (which currently always sends `client_id`/`client_secret` in the POST body) needs a small per-provider branch, or you extend `OAuthProviderConfig` with an `authStyle: 'body' | 'basic'` flag and branch on it inside `callbackProvider`.

Add to `oauth.config.ts`:

```ts
notion: {
    clientId: env.NOTION_CLIENT_ID,
    clientSecret: env.NOTION_CLIENT_SECRET,
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scope: '', // Notion does not use OAuth scopes; access is granted per-page at consent time
    params: { owner: 'user' },
},
```

### G.3 The Notion adapter

Notion's search endpoint returns every page and database the integration has been granted access to. Create `server/src/modules/integration/adapters/notion.adapter.ts`:

```ts
import type { IntegrationAdapter, UniversalTask } from './types.ts';

interface NotionSearchResult {
    id: string;
    url: string;
    last_edited_time: string;
    properties?: Record<string, { title?: { plain_text: string }[] }>;
}

export class NotionAdapter implements IntegrationAdapter {
    async fetchItems(accessToken: string): Promise<UniversalTask[]> {
        const res = await fetch('https://api.notion.com/v1/search', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filter: { property: 'object', value: 'page' },
                sort: { direction: 'descending', timestamp: 'last_edited_time' },
                page_size: 20,
            }),
        });

        if (!res.ok) {
            throw new Error(`Notion API error: ${res.status} ${res.statusText}`);
        }

        const { results } = (await res.json()) as { results: NotionSearchResult[] };

        return results.map((page): UniversalTask => {
            const titleProp = Object.values(page.properties ?? {}).find(p => p.title);
            const title = titleProp?.title?.[0]?.plain_text ?? 'Untitled';

            return {
                externalId: page.id,
                title,
                link: page.url,
                status: 'active',
                type: 'issue', // Notion pages don't map cleanly to issue/pr/email;
                                // treat as a generic actionable item for now
                provider: 'notion' as UniversalTask['provider'], // widen the type union, see note below
            };
        });
    }
}
```

Note: the `UniversalTask.provider` type as defined in Part D.3 is `'github' | 'gmail'`, straight from the README's original spec. Adding Notion means widening it to `'github' | 'gmail' | 'notion'` in `types.ts`, and widening `type` if you want a dedicated `'page'` variant instead of overloading `'issue'`. This is exactly the kind of change the adapter pattern was built to make painless: one union type update, plus a registry entry, and nothing about `GitHubAdapter`, `GmailAdapter`, the `getItems` controller, or the frontend's aggregation logic needs to change.

### G.4 Register it and surface it

Add to `adapters/registry.ts`:

```ts
import { NotionAdapter } from './notion.adapter.ts';

const ADAPTER_REGISTRY: Record<string, IntegrationAdapter> = {
    github: new GitHubAdapter(),
    gmail: new GmailAdapter(),
    notion: new NotionAdapter(),
};
```

On the frontend, `NotionCard.tsx` and the `notion` branch of `IntegrationPanel.tsx`/`DashboardLayout.tsx`'s `handleDragEnd` already exist, built against the mock `NotionPage` shape. Repeat the same mapping decision from Part F.5 (simple generic card versus full fidelity mapping) for Notion's `UniversalTask` results.

***

## Part H: End to end test checklist and troubleshooting

### H.1 Checklist

Run through this after finishing Parts B through F (and G if you built Notion).

- [ ] `bun run build` (which runs `tsc` in type-check mode) passes with no type errors in `server`.
- [ ] Server boots without a Zod validation error (confirms `.env` is complete and `ENCRYPTION_KEY` is exactly 32 characters).
- [ ] `GET /api/v1/integrations/auth/github` (with a valid `Authorization` header) returns a `302` to `github.com`.
- [ ] `GET /api/v1/integrations/auth/gmail` returns a `302` to `accounts.google.com`.
- [ ] Completing GitHub's consent screen redirects back to `/dashboard?integration_success=github`, and a new `Integration` document exists in MongoDB with `provider: 'github'`, an encrypted `accessToken`, and `status: 'active'`.
- [ ] Completing Google's consent screen redirects back to `/dashboard?integration_success=gmail`, and the stored document has `provider: 'gmail'` (not `'google'`, confirming the Part C fix worked), plus a non-empty `refreshToken`.
- [ ] `GET /api/v1/integrations` returns both connected providers, with no `accessToken`/`refreshToken` fields in the response.
- [ ] `GET /api/v1/integrations/items` returns a mixed array of `UniversalTask` objects with `type: 'issue' | 'pr'` from GitHub and `type: 'email'` from Gmail.
- [ ] The frontend's integration panel shows real titles from your actual GitHub issues/PRs and Gmail inbox, not the strings from `mockData.ts`.
- [ ] Dragging a card onto a kanban column creates a real `Task` document in MongoDB with `source` and `externalId` populated.
- [ ] `DELETE /api/v1/integrations/github` removes the document, and a subsequent `GET /api/v1/integrations/items` no longer includes any GitHub items.
- [ ] Waiting past Gmail's roughly one hour access token expiry (or manually setting `expiresAt` to a past date in MongoDB to speed up testing), then hitting `GET /api/v1/integrations/items` again, still succeeds, because `resolveAccessToken` transparently refreshes.

### H.2 Common errors and what they mean

**`ValidationError: provider is not a valid enum value for path 'provider'`**
This is exactly the Part C bug: something is still writing `'google'` instead of `'gmail'` to the `Integration` model. Confirm `oauth.config.ts`'s key is `gmail`, not `google`, and that nothing else in the codebase (a leftover reference, a stale cached build) is still sending `'google'` as the `:provider` URL param.

**Google returns `redirect_uri_mismatch`**
The redirect URI Google receives at authorization time must be byte for byte identical to one of the URIs registered on the OAuth client in Google Cloud Console, including the scheme, port, and trailing slash (or lack of one). Since renaming the provider key in Part C.3 changes the callback path from `/auth/google/callback` to `/auth/gmail/callback`, go back to the Google Cloud Console credential and make sure it lists `http://localhost:8000/api/v1/integrations/auth/gmail/callback` exactly.

**Gmail refresh fails with `invalid_grant`**
This means the stored refresh token is no longer valid. The most common causes: the user revoked Zenith's access from their [Google Account permissions page](https://myaccount.google.com/permissions), the refresh token was never issued in the first place (missing `access_type: offline` or `prompt: consent` in `oauth.config.ts`, see Part B.2), or the OAuth consent screen is still in "Testing" mode and Google expired unused test tokens after seven days. `token.service.ts`'s `resolveAccessToken` already marks the integration `status: 'revoked'` when this happens; surface that in the frontend (Part F.7) so the user knows to reconnect rather than seeing a silent empty feed.

**`ENCRYPTION_KEY must be exactly 32 characters` on server boot**
Count the characters in your `.env` value. This is enforced by the Zod schema in `server/src/config/env.ts` and will not start the server until fixed. AES-256 requires a key of this exact length for the `crypto-js` library used in `server/src/utils/crypto.ts`.

**CORS errors in the browser console when calling `/integrations/items`**
Check `server/src/app.ts`'s CORS configuration:

```ts
app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    ...
}));
```

`FRONTEND_URL` must match the origin your Next.js dev server is actually running on, `http://localhost:3000` by default. If you changed the client's port, update `FRONTEND_URL` in `server/.env` to match, or the browser will block every fetch from `client/lib/api.ts` before it even reaches your controller.

**`401 Unauthorized` from `GET /api/v1/integrations/auth/github` when clicked from the browser**
This is the F.2 gap: a plain browser navigation cannot send an `Authorization` header. If you have not yet added the cookie based fallback described in Part F.2, this route will only work when called with an explicit header via `curl`, not from a real click in the UI.

**`403 Upgrade to Pro to use integrations`**
This is `gateIntegrations` in `server/src/middleware/featureGate.middleware.ts` working as designed. It blocks the entire integrations router for users whose effective plan is `free` (checked via `PLAN_LIMITS[plan].integrations`). During development, either use a test user with `plan: 'pro'`, or a user with an active `trialEndsAt` still in the future, since `getEffectivePlan` treats an active trial as Pro-level access.

***

You now have every piece: a fixed OAuth flow with the provider naming bug resolved, an adapter layer with a shared `UniversalTask` normalization, three new endpoints exposing that data, a frontend that fetches real items instead of mock ones, and a real task written to MongoDB when a card is dropped onto the kanban board. Notion follows the exact same seams the moment you are ready to add it.
