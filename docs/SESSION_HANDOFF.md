# Zenith Session Handoff

Last updated: 2026-07-13. Read this first when resuming. It captures where the project stands, how to run it, what is done, and what is left.

## How to resume (quick start for whoever picks this up)

1. Read this file, then skim `CLAUDE.md` at the repo root for architecture.
2. If you want to run it: follow "Environment setup" and "Run locally" below.
3. If you are continuing the build: see "What remains" and the ownership split.
4. Docs you have: integration guides (`INTEGRATIONS_QUICKSTART.md`, `INTEGRATIONS_GUIDE.md`) and billing guides (`BILLING_STRIPE.md`, `BILLING_DODO.md`), all in `docs/`.

## Working preferences (how the user wants Claude to operate)

- Claude acts as an ORCHESTRATOR: spawn multiple parallel subagents for tasks rather than doing them inline.
- Subagents run on Sonnet 5.
- Do NOT use the double hyphen or em dash characters in prose or generated code and docs. Exception seen in practice: literal CLI flags (for example `stripe listen` with its forward flag) and markdown table separators are kept because removing them breaks the command or the table.
- When stuck: do not spin silently. Ask the user, or move forward after notifying them with a concrete proposal.
- The USER builds the integrations feature themselves. Claude must NOT touch `server/src/modules/integration/` or the client integration components.

## What Zenith is

A calm daily planning and productivity SaaS. Kanban day board, Pomodoro focus mode, daily planner, morning and evening rituals. It pulls GitHub, Gmail, and Notion items into one unified task feed. Free vs pro tiers with a 7 day trial. Solo developer, Bun everywhere.

## Repository layout

- `client/` Next.js 16 (App Router) + React 19 frontend. Auth UI and planner data are wired to the backend. Integration cards still use mock data (user is building that).
- `server/` The active backend: monolithic Bun + Express 5 + MongoDB + Redis or BullMQ. Source of truth.
- `services/` Dead microservices the monolith replaced. Do not develop here.

## Current verification status (IMPORTANT)

Everything built this session passes `tsc` type checking and lint, but NONE of it has been run against a live MongoDB or Redis. Flows are wired correctly on paper but unverified end to end. The first real run is the top pending task. Reason it was not done: no local Mongo or Redis in the environment, and Docker's daemon needed a sudo password that could not be supplied non interactively.

## Done this session

Backend (`server/`):
- OAuth logins fixed end to end. Unified onto the single `User` model, account linking by email, new OAuth users get plan + 7 day trial + verified. Callbacks mint the JWT the same way local login does, so OAuth tokens now work on protected routes.
- IDOR closed on `/auth/update/:userId`, `/auth/delete/:userId`, `/auth/me/:userId`, and the email lookup (self only, 403 otherwise).
- New endpoints: `POST /auth/verify-email` and `POST /auth/resend-verification`. Welcome email is now enqueued (on verify for local, on new OAuth signup).
- Planner gaps closed: `PUT /planner/tasks/:taskId` now accepts `channel`, `duration`, `startTime`. New `GET /planner/tasks/id/:taskId`, `PUT /planner/channels/:channelId`, `DELETE /planner/channels/:channelId`. Task model gained `duration` and `startTime`.

Frontend (`client/`):
- Auth foundation: typed API client (`client/lib/api/client.ts`, base from `NEXT_PUBLIC_API_URL`), `useAuthStore`, login, signup, forgot password, reset password pages, Google and GitHub buttons, OAuth callback handler, `/dashboard` protected via `RequireAuth`.
- Planner data (tasks, channels, daily planner) wired through `client/lib/api/planner.ts` + `client/lib/api/plannerMapping.ts` into `client/store/useStore.ts`, loaded on auth. Tag, duration, time, and notes edits now round trip and survive reload.
- New `/settings` and `/profile` pages. Nav wired: notification bell popover, calendar popover, Home to `/dashboard`, invite dialog. Landing header Login and Start for Free buttons route to `/login` and `/signup`.
- Weekly rituals lifted into the store (session only).

Billing:
- A Stripe implementation was built, then FULLY REVERTED at the user's request (verified clean, no Stripe code or `/billing` route remains). Two simple guides written instead: `docs/BILLING_STRIPE.md` and `docs/BILLING_DODO.md`.

Docs written for the user:
- `docs/INTEGRATIONS_GUIDE.md` (deep, ~1325 lines) and `docs/INTEGRATIONS_QUICKSTART.md` (condensed, ~588 lines) for building integrations.
- `docs/BILLING_STRIPE.md` and `docs/BILLING_DODO.md` for adding billing.

## Environment setup

Copy `server/.env.example` to `server/.env` and fill it in. The server validates on boot and crashes if a required var is missing.

Required:
- `MONGO_URI` MongoDB connection string
- `JWT_SECRET` long random string
- `GMAIL_USER` a valid Gmail address
- `GMAIL_APP_PASSWORD` 16 character Gmail app password
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `ENCRYPTION_KEY` exactly 32 characters

Optional (defaults exist): `PORT` (8000), `REDIS_HOST` (localhost), `REDIS_PORT` (6379) or `REDIS_URL`, `FRONTEND_URL` (http://localhost:3000), `API_BASE_URL` (http://localhost:8000).

Client: `client/.env.local` already exists with `NEXT_PUBLIC_API_URL=http://localhost:8000`.

Tip: to try only local email/password auth and the planner, only `MONGO_URI`, `JWT_SECRET`, `ENCRYPTION_KEY`, and the `GMAIL_*` vars matter, but the server still refuses to boot without the OAuth vars, so put placeholders there.

## Run locally (no orchestration exists; do it by hand)

You need MongoDB and Redis running. Options: install locally, run via Docker (`docker run` mongo and redis), or use hosted (Mongo Atlas, Upstash Redis).

1. Start MongoDB and Redis.
2. `cd server && bun install && cp .env.example .env` then fill `.env`, then `bun run dev` (port 8000).
3. `cd client && bun install && bun run dev` (port 3000).
4. Health check: `GET http://localhost:8000/health`.

Type check anytime: server `cd server && bun run build`; client `cd client && bunx tsc --noEmit`.

## What remains (prioritized)

1. Live end to end run. Stand up Mongo + Redis, run both apps, exercise register, verify, login, OAuth, and planner CRUD. This will surface the first real bugs. BLOCKED until infra is available.
2. Integrations (USER owns this). OAuth connect is stubbed and tokens are never used. Build the adapter layer, the list, disconnect, and items endpoints, wire the frontend, add Notion, and fix the `google` vs `gmail` provider enum bug. See the integration guides.
3. Billing (by design, not implemented). Plan gating is built; only the pay flow is missing. Pick Stripe or Dodo from the billing guides.

## Small follow ups (noted, not blocking)

- Weekly rituals persist only in session; a backend "rituals" model is needed for durable storage.
- The kanban header "Today" calendar cannot jump the board to a date yet; it needs a store helper plus a `data-date` attribute on the columns (`KanbanColumn.tsx`).
- Genuinely dead end UI with no backend: notification bell (no notifications API), invite (no invite backend), task detail ACTUAL time and Play button (no time tracking backend).

## Hygiene (user chose to skip for now)

No tests, no CI, no docker-compose or root run scripts. The dead `services/` microservices folder is still committed.

## Key file pointers

- Architecture and conventions: `CLAUDE.md` (repo root).
- API client and auth: `client/lib/api/client.ts`, `client/store/useAuthStore.ts`, `client/components/auth/RequireAuth.tsx`.
- Planner data wiring and mapping: `client/lib/api/planner.ts`, `client/lib/api/plannerMapping.ts`, `client/store/useStore.ts`.
- Backend entry and env: `server/src/index.ts`, `server/src/app.ts`, `server/src/config/env.ts`.
- Plan and feature gating: `server/src/config/planLimits.ts`, `server/src/middleware/featureGate.middleware.ts`.
