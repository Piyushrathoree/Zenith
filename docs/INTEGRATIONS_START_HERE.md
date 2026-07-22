# Integrations: Start Here

> **Status as of 2026-07-19: this is all built.** You asked Claude to finish it, so the code below
> exists on disk: the adapter layer, the token service, all the endpoints, and the frontend wiring.
> The rest of this doc, and `INTEGRATIONS_QUICKSTART.md`, are now READING material for understanding
> what is there, not a TODO list to work through.
>
> What is left is the part no one can do for you: **Phase B, creating the OAuth apps**. Go make the
> GitHub OAuth app and the Google Cloud credential, put the client ids and secrets in `server/.env`,
> and connect with a Pro or trial user. Nothing has ever run against a live provider, so expect the
> first pass to surface real-world issues (a redirect URI typo is the usual one).
>
> Two things to know that these docs predate:
> - The Google redirect URI must end in `/auth/gmail/callback`, not `/auth/google/callback`.
> - Notion is optional. Without `NOTION_CLIENT_ID` and `NOTION_CLIENT_SECRET` the server still boots
>   and simply stops offering Notion in the UI.

Read this before `INTEGRATIONS_QUICKSTART.md`. That doc is the reference. This one is the
on-ramp, for when you open the repo and can't figure out where the first keystroke goes.

***

## 1. You have more than you think

Already built and working in `server/src/modules/integration/`:

| Thing | File | Status |
|-|-|-|
| OAuth redirect (step 1) | `integration.controller.ts` → `connectProvider` | real, works |
| Token exchange + storage (step 2) | `integration.controller.ts` → `callbackProvider` | real, works |
| Provider config | `oauth.config.ts` | GitHub + Google filled in |
| Token encryption | `utils/crypto.ts` → `encryptData` / `decryptData` | real, works |
| `Integration` model | `integration.model.ts` | done, enum `github \| gmail \| notion` |
| Routes mounted + plan gated | `integration.routes.ts`, `app.ts:52` | done |

What is actually missing: **three small files and three controller functions.**

Nothing architectural is undecided. No new dependencies. The quickstart's 588 lines make it
look like a project. It is an afternoon.

***

## 2. Why you're stuck

You are trying to hold Phases C through H in your head at the same time. That is not a coding
problem, it is a working-memory problem. The fix is to shrink the first step until it is
insultingly small, then take it.

***

## 3. The one sentence that replaces the whole quickstart

> An adapter is a function: **access token in, array of `{ id, title, link, status }` out.**
> Everything else already exists.

Gmail is that same function with a different URL. Notion is that same function with a different
URL. There is no second concept in this entire feature.

***

## 4. Today, in order

### Step 1: 30 seconds, zero thinking

Open `server/src/modules/integration/oauth.config.ts`, line 16. Change the key `google:` to
`gmail:`. Save.

That is Phase C of the quickstart, complete. The provider enum bug is fixed. You just wrote code.

(If you already made the Google Cloud credential, go fix its redirect URI to end in
`/auth/gmail/callback`.)

### Step 2: 10 minutes, the actual restart

Do **not** open the Zenith repo for this. Make a throwaway file anywhere:

```ts
// scratch.ts
const token = "ghp_..."; // personal access token from github.com/settings/tokens

const res = await fetch("https://api.github.com/issues?filter=assigned&state=all", {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "test" },
});

const items = await res.json();
console.log(items.map((i: any) => i.title));
```

Run `bun scratch.ts`. Watch your real GitHub issue titles print in your terminal.

No OAuth. No Mongo. No Express. No types. No classes. The only goal is to feel code working
again, and this is the shortest path from here to that feeling. Do not skip it because it looks
too easy. It looking too easy is the entire point.

### Step 3: see that you already did the hard part

Now open `INTEGRATIONS_QUICKSTART.md` and look at `GitHubAdapter` (Phase D.2, around line 187).

It is your scratch file. Wrapped in a class, with the `.map()` returning a fixed object shape
instead of just `title`. That is the whole "adapter layer" you have been circling.

***

## 5. Build order, one sitting each

Stop after every line. Do not read ahead.

- [ ] `adapters/types.ts` — the `UniversalTask` + `IntegrationAdapter` interfaces. About 8 lines.
- [ ] `adapters/github.adapter.ts` — your scratch file, reshaped to return `UniversalTask[]`.
- [ ] `adapters/registry.ts` — a lookup object plus a `getAdapter()`. About 5 lines.
- [ ] `getItems` in `integration.controller.ts` + one `router.get('/items', getItems)` line.
- [ ] `curl localhost:8000/api/v1/integrations/items -H "Authorization: Bearer <JWT>"` and see real data.

**Gmail, token refresh, disconnect, and the entire frontend do not exist until that curl works.**
Quickstart Phases D.3, D.4, E, F, and G are all deliberately out of scope until then.

***

## 6. House pattern, so you don't have to go looking

- No service layer anywhere in this repo. Controllers talk to mongoose models directly.
- Controllers are plain `export const fn = async (req: Request, res: Response): Promise<void>`.
  No classes, no `asyncHandler` wrapper.
- Responses: `res.status(200).json(new ApiResponse(200, data, 'message'))`.
  Errors: `res.status(4xx).json(new ApiError(4xx, 'message'))`. Both from `server/src/utils/`.
- Imports inside `server/` use explicit `.ts` extensions.
- Prettier: double quotes, 4-space indent, semicolons.
- Type check with `cd server && bun run build` (it is `tsc --noEmit`, nothing is emitted).

***

## 7. Two things to know before they bite you

**The tokens in Mongo are encrypted.** An adapter must never touch `Integration.accessToken`
directly. Decryption happens one layer up, in the controller or in `token.service.ts`. Keep
adapters as pure "token in, tasks out" so they stay trivially testable.

**`profile` is a lie right now.** `callbackProvider` hardcodes
`{ username: 'connected', avatar: '' }` with a comment saying it gets updated on the first API
call. That follow-up call does not exist. When you build the GitHub adapter, that is a natural
place to finally fill it in, but it is optional and not on the critical path.

***

## 8. If you stall again

Ask yourself only this: **what is the smallest thing I can run and watch produce output?**

Then do that thing instead of the thing you were planning. Momentum is the resource you are
short on right now, not knowledge. The knowledge is all in `INTEGRATIONS_QUICKSTART.md` and it
will still be there in an hour.
