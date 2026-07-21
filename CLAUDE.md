# Zenith

A calm daily-planning / productivity app. Tagline: "Start Calm. Stay Focused. End Confident."
It unifies work from external tools (GitHub issues/PRs, Gmail, Notion) into a single day-planner
built around a Kanban day board, a Pomodoro focus mode, a daily planner, and morning/evening rituals.
Two-tier SaaS model (free vs pro) with a 7-day trial.

Single-developer project (Piyush Rathoree). Package manager is **Bun** everywhere. No monorepo tooling.

## Repository layout

- `client/` — Next.js 16 (App Router) + React 19 frontend. Auth UI and planner data (tasks/channels/daily planner) are now wired to the backend API. Integration cards still use mock data (owned by the user, in progress).
- `server/` — The active backend: monolithic Bun + Express 5 + MongoDB + Redis/BullMQ. This is the source of truth.
- `services/` — **Dead code.** Four old microservices (user/planner/notification/integration) that `server/` replaced.
  Kept for git history/reference only. Nothing imports or runs them. Do not develop here.

## Architecture (server/)

Monolith consolidating four former microservices into modules under `server/src/modules/{auth,planner,integration,notification}`.

- Entry: `server/src/index.ts` → validates env (`config/env.ts`, Zod) → `connectDB()` → `startEmailWorker()` (BullMQ worker runs IN-PROCESS) → `app.listen`.
- API base path: `/api/v1` → `/auth`, `/planner`, `/integrations`. Health at `/health`.
- Auth: JWT (Bearer) for API; Passport (Google + GitHub) for OAuth login; `express-session` only for the OAuth handshake.
- Plan/feature gating: `config/planLimits.ts` + `middleware/featureGate.middleware.ts` (task caps, planner-range caps, integrations = pro/trial only). Active trial counts as pro.
- Async email: BullMQ queue (`modules/notification/email.producer.ts`) + in-process worker (`email.worker.ts`) + nodemailer/Gmail.
- Token security: `utils/crypto.ts` AES-256 (crypto-js) encrypts stored OAuth tokens + CSRF `state`.

## Frontend (client/)

- State: **Zustand** (`store/useStore.ts`) is the single source of truth, seeded from `lib/mockData.ts`.
  `context/AppContext.tsx` is just a shim re-exporting the store as `useApp`.
- react-query is mounted but unused; react-hook-form/zod/recharts installed but unused.
- No auth UI, no API calls, no persistence — all state resets on reload.

## Running locally (manual; no orchestration exists)

Requires MongoDB + Redis + a Gmail App Password + Google & GitHub OAuth apps standing by.
1. `cd server && bun install && cp .env.example .env` (fill in all required vars) `&& bun run dev` (port 8000)
2. `cd client && bun install && bun run dev` (port 3000)

Required server env (validated at startup, crashes if missing): `MONGO_URI`, `JWT_SECRET`, `GMAIL_USER`,
`GMAIL_APP_PASSWORD`, `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`, `ENCRYPTION_KEY` (exactly 32 chars).

## Conventions

- Bun runs `.ts` directly; imports use explicit `.ts` extensions in `server/`. Build script is `tsc --noEmit` (type-check only).
- Prettier root config: double quotes, 4-space tabs, semicolons, es5 trailing commas.
- Response/error shape: `utils/ApiResponse.ts` / `utils/ApiError.ts`, thrown and handled by the global error middleware in `app.ts`.

## Progress log

Done (type-checks/lints clean, but NOT yet run against a live Mongo/Redis stack):
- Frontend now has auth UI (login/signup/forgot/reset, Google + GitHub buttons, OAuth callback), a typed API client (`client/lib/api/client.ts`, base from `NEXT_PUBLIC_API_URL`), a `useAuthStore`, and client-side `/dashboard` protection via `RequireAuth`.
- Planner data (tasks/channels/daily planner) is wired through `client/lib/api/planner.ts` + `client/lib/api/plannerMapping.ts` into `useStore.ts`, loaded on auth. See mapping notes at top of `plannerMapping.ts`.
- Backend: OAuth unified onto the single `User` model with email account-linking (OAuth JWTs now work on protected routes); IDOR closed on `/auth/:userId` routes; added `POST /auth/verify-email` and `POST /auth/resend-verification`; welcome email now enqueued.
- Backend planner gaps closed: `PUT /planner/tasks/:taskId` now accepts `channel`/`duration`/`startTime`; new `GET /planner/tasks/id/:taskId`, `PUT`/`DELETE /planner/channels/:channelId`; task model has `duration`/`startTime`.
- Frontend: `/settings` and `/profile` pages, nav buttons wired (bell popover, calendar popover, Home, Invite dialog); client now persists tag/duration/time round-trip and Notes edits; weekly rituals lifted into the store (session-only, needs a backend model for durable persistence).
- Docs for the user: `docs/INTEGRATIONS_QUICKSTART.md` (build-from) + `docs/INTEGRATIONS_GUIDE.md` (deep) for integrations; `docs/BILLING_STRIPE.md` + `docs/BILLING_DODO.md` (simple) for billing.
- **Integrations built end to end** (was the user's domain, handed to Claude). Backend: adapter layer
  (`modules/integration/adapters/` = `types.ts` with `UniversalTask`/`IntegrationAuthError`/`toIsoDate`,
  one adapter per provider, `registry.ts`), `token.service.ts` (Gmail refresh with a 60s skew, revoke on
  a dead token), and endpoints `GET /providers`, `GET /`, `GET /auth/:provider/url`, `GET /items`,
  `DELETE /:provider`, with a per-user Redis items cache (90s TTL, generation-counter invalidation, fails
  open). Frontend: `lib/api/integrations.ts` + `integrationsMapping.ts` (widens `UniversalTask` back into
  the four rich card view types so no card component changed), an integrations slice in `useStore.ts`, and
  a full panel state machine (loading / not entitled / not connected / needs reconnect / fetch error /
  empty / items). Task provenance (`source`, `externalId`, `link`) now persists to Mongo on drag-to-board.
  Three bugs fixed that blocked the flow entirely: the OAuth callback sat behind `authMiddleware` so
  provider redirects always 401'd; a browser navigation cannot carry a bearer token, hence the
  `/auth/:provider/url` two-step; and the `google` vs `gmail` provider enum mismatch.
  Hardened after review: OAuth `state` is now bound to its provider and single-use via a Redis nonce
  (fails closed), and the callback has its own IP rate limiter.

## Known gaps / not yet built

- **End to end unverified**: all the above passes typecheck/lint but has NOT been run against a live backend. First real-run pass is pending.
- **Integrations are built but unrun**: full stack is in place (see the progress log), type-checks and lints clean, but has never been exercised against live GitHub/Google/Notion OAuth apps. Needs real credentials in `.env` plus a Pro or trial user to test.
- **No billing** (intentionally not implemented): plan/trial + gates are built, but nothing moves a user free → pro. A Stripe attempt was built then fully reverted per the user's choice. See `docs/BILLING_STRIPE.md` or `docs/BILLING_DODO.md` to add it.
- **Weekly rituals** persist only in-session; durable storage needs a new backend "rituals" model.
- **"Today" calendar** in the kanban header can't jump the board to a date yet (needs a store helper + `data-date` on columns).
- No tests, no CI, no docker-compose, no root run scripts.
