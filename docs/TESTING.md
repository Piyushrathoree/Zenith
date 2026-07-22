# Testing Zenith Locally

**Status**: this stack has never been run against live infrastructure or real OAuth providers.
Everything type-checks and lints clean (see `CLAUDE.md`), but the first real run is expected to
surface real world issues, wrong assumptions, a missing index, an off by one in a date range,
whatever it is. That is normal, not a sign something upstream is broken. Work through this doc in
order and file/fix issues as you hit them.

## 1. Start infrastructure

MongoDB and Redis run in Docker via the `docker-compose.yml` at the repo root. The app itself is
not containerised, you still run `server` and `client` with `bun run dev` directly (section 3).

```bash
cd /mnt/a/Codebase/Zenith
docker compose up -d
```

Confirm both are healthy (not just "running"):

```bash
docker compose ps
```

You want `zenith-mongo` and `zenith-redis` both showing `healthy` in the STATUS column. It takes a
few seconds after `up -d` returns, the healthchecks poll every 5s.

Tear down (containers stop, named volumes and your test data survive):

```bash
docker compose down
```

Wipe the database for a clean slate (also deletes the volumes):

```bash
docker compose down -v
```

## 2. Create `server/.env`

```bash
cd /mnt/a/Codebase/Zenith/server
cp .env.example .env
```

Then edit `server/.env`. Every key below is validated by the Zod schema in
`server/src/config/env.ts` at process startup, an invalid or missing required value crashes the
server immediately with a readable error instead of failing later at some random call site.

- **`JWT_SECRET`**: any long random string, no format requirement beyond non-empty. Generate one:

  ```bash
  openssl rand -hex 32
  ```

- **`ENCRYPTION_KEY`**: MUST be exactly 32 characters, the schema enforces `.length(32)` and the
  server refuses to boot otherwise. This key is fed straight into AES-256 (`server/src/utils/crypto.ts`,
  used to encrypt stored OAuth tokens), and AES-256 needs a 256 bit, i.e. 32 byte, key. Generate an
  exact 32 character hex string:

  ```bash
  node -p "require('crypto').randomBytes(16).toString('hex')"
  ```

- **`GMAIL_USER`** / **`GMAIL_APP_PASSWORD`**: required at boot (`GMAIL_USER` must merely parse as
  an email address, `GMAIL_APP_PASSWORD` just needs to be non-empty), so the server will not start
  without them. For testing everything except actual email delivery, a syntactically valid
  placeholder is enough:

  ```
  GMAIL_USER=test@example.com
  GMAIL_APP_PASSWORD=placeholder-value
  ```

  With placeholders, real Gmail SMTP calls will fail inside the BullMQ email worker
  (`server/src/modules/notification/email.worker.ts`), you'll see a `[EmailWorker] Job ... failed`
  line in the server log. That failure is caught by BullMQ and logged, it does not crash the
  process or block the API response that queued it, registration and login both return normally.
  What you lose: the verification code email and the welcome email never arrive. That's fine for
  testing, email verification is intentionally NOT enforced at login right now (see the comment
  above `verifyEmail` in `server/src/modules/auth/auth.controller.ts`), so an unverified account
  signs in exactly like a verified one.

- **`GOOGLE_CLIENT_ID`** / **`GOOGLE_CLIENT_SECRET`** and **`GITHUB_CLIENT_ID`** /
  **`GITHUB_CLIENT_SECRET`**: also required at boot, placeholders (any non-empty string) get the
  server running, but you need REAL values to actually exercise Google/GitHub login or the
  GitHub/Gmail integrations. See section 5.

- **`NOTION_CLIENT_ID`** / **`NOTION_CLIENT_SECRET`**: genuinely optional, they default to an empty
  string in the schema. Leave them commented out, the server boots fine and the app simply does not
  offer Notion as a connectable provider (it's a stub regardless, see `CLAUDE.md`).

Leave the rest as `.env.example` ships them, they already match the compose services and each
other: `MONGO_URI=mongodb://localhost:27017/zenith`, `REDIS_HOST=localhost`, `REDIS_PORT=6379`,
`FRONTEND_URL=http://localhost:3000`, `API_BASE_URL=http://localhost:8000`, `PORT=8000`.

`client/.env.local` already exists and is correct as is: `NEXT_PUBLIC_API_URL=http://localhost:8000`
matches the server's default `API_BASE_URL`, nothing to change there.

## 3. Run the apps

Two terminals, infrastructure from section 1 must already be up.

```bash
# terminal 1
cd /mnt/a/Codebase/Zenith/server
bun install
bun run dev      # nodemon --exec bun src/index.ts, http://localhost:8000
```

```bash
# terminal 2
cd /mnt/a/Codebase/Zenith/client
bun install
bun run dev      # next dev, http://localhost:3000
```

Confirm the server booted (no Zod error) and can see Mongo/Redis:

```bash
curl http://localhost:8000/health
```

Expect `{"status":"ok","timestamp":"..."}`. Then open `http://localhost:3000` in a browser.

## 4. Smoke test the core app (no OAuth setup needed yet)

This is the part you can fully exercise before creating a single OAuth app.

1. **Sign up**: `http://localhost:3000/signup`. Registration (`POST /api/v1/auth/register`)
   automatically grants a 7 day trial (`trialEndsAt = now + 7 days`), and an active trial counts as
   Pro for every plan gated feature (`getEffectivePlan` in
   `server/src/middleware/featureGate.middleware.ts` treats a trial user exactly like `plan: 'pro'`).
   So for the next 7 days, task limits, planner date range limits, and the integrations gate all
   behave as if you were paying. This persists to MongoDB, the `users` collection.
2. **Log in**: `http://localhost:3000/login`.
3. **Day board / Kanban**: create tasks, drag them between columns. Wired to
   `POST /api/v1/planner/tasks/:channel` and `PUT /api/v1/planner/tasks/:taskId`, persists to the
   `tasks` collection in MongoDB, survives a reload.
4. **Daily planner**: wired to `POST /api/v1/planner/daily-planner` and
   `PUT /api/v1/planner/daily-planner/:date`, also persists to MongoDB.
5. **Focus timer (Pomodoro)**: purely client side Zustand state (`focusMode`/`focusTask` in
   `client/store/useStore.ts`), no backend calls at all. Session only, resets on reload.
6. **Morning/evening rituals**: the daily ones round trip through the planner API above. The
   **weekly** rituals are session only by design right now (`CLAUDE.md`: "weekly rituals lifted into
   the store, session-only, needs a backend model for durable persistence"), they will NOT survive a
   reload, that's a known gap, not a bug you need to chase.

## 5. Set up the OAuth apps for integrations

Only needed once you're past section 4 and want to test GitHub/Gmail integrations (or Google/GitHub
social login). Full walkthrough:
`docs/INTEGRATIONS_QUICKSTART.md`, [Phase B](INTEGRATIONS_QUICKSTART.md#phase-b-oauth-provider-setup-external).
The callback URLs are the single most common failure (a byte for byte mismatch gets rejected), so
they're repeated here:

- **GitHub**: `http://localhost:8000/api/v1/integrations/auth/github/callback`
- **Google**: `http://localhost:8000/api/v1/integrations/auth/gmail/callback`, note it is
  `gmail`, NOT `google`, the app's provider enum only knows `gmail` (see the Phase C note in the
  quickstart doc for the history there).

For Google specifically, also: enable the Gmail API on the project in Google Cloud Console before
testing, and while the OAuth consent screen is in Testing status, add your own Google account under
Test users, otherwise Google refuses consent outright before you even see a scope screen.

Once you have real Client ID/Secret pairs, put them in `server/.env` and restart `bun run dev`
(nodemon will pick up the file change on its own, but a full restart is the safer check).

## 6. Test integrations end to end

Requires a logged in user with an active trial or `plan: 'pro'` (see section 4, step 1) and real
OAuth credentials from section 5.

1. From the dashboard sidebar, click Connect on a provider (GitHub or Gmail).
2. The browser leaves the app entirely for the provider's consent screen (this is a full page
   navigation, not a fetch, a bearer token cannot ride along on a redirect). Approve access.
3. You land back on `/dashboard` with a success toast/query param.
4. Confirm items show up in the integrations panel, real titles, not the strings from
   `client/lib/mockData.ts`.
5. Drag one item onto the board. This creates a real task via the planner API, carrying
   provenance fields.
6. Confirm in MongoDB that the created task has `source`, `externalId`, and `link` populated,
   connecting through the compose container:

   ```bash
   docker compose exec mongo mongosh zenith --eval \
     "db.tasks.find({ source: { \$exists: true } }).sort({ createdAt: -1 }).limit(1).toArray()"
   ```

   Or interactively:

   ```bash
   docker compose exec mongo mongosh zenith
   > db.tasks.find({ source: { $exists: true } }).sort({ createdAt: -1 }).limit(1)
   ```

## 7. Verify by hand with curl

All four endpoints require `Authorization: Bearer <JWT>`. Fastest way to get a token: log in
through the browser, then open devtools, Application/Storage tab, localStorage, key
`zenith_auth_token`, that's the exact same JWT the client attaches to every API call.

```bash
TOKEN="<paste the value of zenith_auth_token from devtools>"

# List which providers exist and whether Notion is configured
curl http://localhost:8000/api/v1/integrations/providers \
  -H "Authorization: Bearer $TOKEN"

# List this user's connected integrations (no token fields in the response)
curl http://localhost:8000/api/v1/integrations \
  -H "Authorization: Bearer $TOKEN"

# Aggregate items across every connected provider
curl http://localhost:8000/api/v1/integrations/items \
  -H "Authorization: Bearer $TOKEN"

# Disconnect a provider
curl -X DELETE http://localhost:8000/api/v1/integrations/github \
  -H "Authorization: Bearer $TOKEN"
```

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Server exits immediately with a Zod validation error listing keys | `server/.env` is missing a required key, or a value fails its schema check (e.g. `GMAIL_USER` isn't email shaped) | Diff against `server/.env.example` and section 2, fill in every required key with at least a valid placeholder |
| `ENCRYPTION_KEY must be exactly 32 characters` | The value in `.env` is the wrong length | Regenerate with `node -p "require('crypto').randomBytes(16).toString('hex')"`, that always yields exactly 32 hex characters |
| Google/GitHub consent screen shows `redirect_uri_mismatch` | The callback URL registered on the provider doesn't byte match what the server sends | Use the exact URLs in section 5, note `gmail` not `google` for the Google credential |
| API call returns `403` "Upgrade to Pro to use integrations..." | Your account is on the free plan and the 7 day trial has expired | Register a fresh test user (new trial), or set that user's `plan` field to `pro` directly in the `users` collection |
| API call returns `401` on an `/integrations/*` endpoint | Missing, expired, or malformed Bearer token | Log in again in the browser and re-copy `zenith_auth_token` from localStorage |
| Clicking Connect in the dashboard does nothing | Not actually logged in, or `client/.env.local`'s `NEXT_PUBLIC_API_URL` doesn't point at the running server | Confirm you're authenticated, confirm the server is up on port 8000 and the env var matches |
| Server can't reach Mongo or Redis on boot (connection refused / timeout) | `docker compose` services aren't up yet, or aren't healthy yet | `docker compose ps`, confirm both show `healthy`; if not, `docker compose up -d` and wait, then retry `bun run dev` |
| An integration in the panel shows a "reconnect" prompt instead of items | The stored OAuth token was revoked or expired and the refresh attempt failed; `token.service.ts` marks the integration `status: 'revoked'` when that happens | Click Connect again on that provider to re-run the OAuth flow and get a fresh token |
