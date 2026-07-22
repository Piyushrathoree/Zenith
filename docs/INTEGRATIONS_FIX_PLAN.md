# Integrations: Fix Plan

Three bugs found on the first live run, plus pagination. Written 2026-07-22.

**Ground rule for this whole plan:** `GET /items` stays cheap. Bodies and page content load
**only when a card is opened**, through one new endpoint. Never make the list heavier.

***

## The four jobs

| # | Problem | Fix location | Size |
|-|-|-|-|
| 1 | Org issues/PRs missing | `adapters/github.adapter.ts:63` + a GitHub settings page | small |
| 2 | Gmail cards have no body | new `fetchDetail` in `adapters/gmail.adapter.ts` | medium |
| 3 | Notion cards have no content | new `fetchDetail` in `adapters/notion.adapter.ts` | medium |
| 4 | No pagination | one param per adapter + `getItems` | medium |

Do them in order. Each is independently shippable. Stop and verify after every one.

***

## Job 1: GitHub org issues and PRs

### Two causes, stacked. Find out which you have before writing code.

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/issues?filter=all&state=open&per_page=100" \
  | jq -r '.[].repository_url' | sort -u
```

- **Org repos appear** → only cause A. The code fix below is enough.
- **Still only your own repos** → cause B is also active. No code change will help until you fix it.

### Cause A: the filter is wrong (code)

`github.adapter.ts:63` uses `filter=assigned`.

When you open a PR you are the **author**, not the assignee. GitHub does not auto-assign. So
`filter=assigned` structurally cannot return anything you made.

Valid values: `assigned`, `created`, `mentioned`, `subscribed`, `all`, `repos`.

**Fix:** two calls, merged and deduped by `item.id`.

```ts
const [assigned, created] = await Promise.all([
    fetchPage(accessToken, "assigned"),
    fetchPage(accessToken, "created"),
]);

const byId = new Map<number, GitHubIssueResponse>();
for (const item of [...assigned, ...created]) byId.set(item.id, item);
const items = [...byId.values()];
```

Why two calls and not `filter=all`: `all` also drags in every issue in every repo you can see,
which on a busy org is thousands of rows you did not ask for. `assigned + created` is exactly
"mine".

### Cause B: org OAuth App access restrictions (not code)

New GitHub orgs have OAuth app restrictions **on by default**. Until an org owner grants your
app access, your token sees zero private org data regardless of the `repo` scope.

Go to `https://github.com/settings/connections/applications/<YOUR_GITHUB_CLIENT_ID>`.
It lists every org you belong to with either a checkmark (granted) or a "Request access" button.
Own the org yourself → you can grant it right there. Someone else's org → they must approve.

If the org uses SAML SSO, you also have to authorize the token for that org from the same page.

**Verify job 1:** rerun the curl above, confirm an org repo URL is in the output, then hit
`GET /api/v1/integrations/items?refresh=true` and confirm the same repo shows up.

***

## Job 2 and 3: content on demand

These two share one design, so build the shared piece first.

### Step 2.1: extend the adapter interface

`adapters/types.ts` — add one optional method and one detail type.

```ts
export interface IntegrationItemDetail {
    externalId: string;
    body: string;          // plain text, already decoded
    truncated: boolean;
}

export interface IntegrationAdapter {
    fetchItems(accessToken: string): Promise<UniversalTask[]>;
    fetchProfile(accessToken: string): Promise<IntegrationProfile>;
    fetchDetail?(accessToken: string, externalId: string): Promise<IntegrationItemDetail>;
}
```

Optional (`?`) means GitHub needs no change at all: it already returns `body` in the list because
GitHub gives it away for free in the same response.

### Step 2.2: one new endpoint

`integration.controller.ts` — new export, same shape as the others:

```ts
export const getItemDetail = async (req: Request, res: Response): Promise<void> => {
    // 1. userId guard (copy the block from getItems)
    // 2. const { provider, externalId } = req.params
    // 3. find the Integration doc for { userId, provider, status: 'active' } -> 404 if none
    // 4. const adapter = getAdapter(provider) -> 404 if no adapter
    // 5. if (!adapter.fetchDetail) -> 400 'This provider has no detail view'
    // 6. const token = await resolveAccessToken(integration)
    // 7. const detail = await adapter.fetchDetail(token, externalId)
    // 8. res.status(200).json(new ApiResponse(200, detail, 'Item detail fetched'))
    // wrap 6-7 in try/catch: IntegrationAuthError -> mark revoked, 401. else 502.
};
```

`integration.routes.ts` — one line, and **it must go above `/:provider`** on line 38 or it gets
swallowed:

```ts
router.get('/items/:provider/:externalId', getItemDetail);
```

Put it right under the existing `router.get('/items', getItems)` on line 34.

**Cache it.** Reuse the pattern already in the file: key `integrations:detail:<userId>:<provider>:<externalId>`,
TTL 300 seconds. Bodies change far less often than the list does. Fail open like `readItemsCache`
already does.

### Step 2.3: Gmail `fetchDetail`

The bug: `gmail.adapter.ts:152` requests `format=metadata`, which returns headers and `snippet`
only. The body is never in that response.

```ts
async fetchDetail(accessToken: string, id: string): Promise<IntegrationItemDetail> {
    const res = await fetch(
        `${GMAIL_API_BASE}/users/me/messages/${id}?format=full`,
        { headers: buildHeaders(accessToken) }
    );
    // same !res.ok / IntegrationAuthError block as fetchItems

    const message = await res.json() as GmailFullMessage;
    const raw = extractPlainText(message.payload);
    return {
        externalId: id,
        body: raw.slice(0, 20000),
        truncated: raw.length > 20000,
    };
}
```

The only real work is `extractPlainText`. A Gmail payload is a **tree**, not a flat list, so this
has to recurse:

```ts
function decodeB64Url(data: string): string {
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

// Depth first, preferring text/plain. Falls back to text/html only if no plain part exists,
// because multipart/alternative emails carry both and plain is the one worth showing.
function extractPlainText(part: GmailPart | undefined): string {
    if (!part) return "";
    if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeB64Url(part.body.data);
    }
    for (const child of part.parts ?? []) {
        const found = extractPlainText(child);
        if (found) return found;
    }
    return "";
}
```

Leave `fetchItems` exactly as it is. `snippet` is still what the card shows before you open it.

### Step 2.4: Notion `fetchDetail`

The bug: `/v1/search` at `notion.adapter.ts:91` returns page **objects** (properties, metadata).
Content lives in blocks, which is a separate call.

```ts
async fetchDetail(accessToken: string, pageId: string): Promise<IntegrationItemDetail> {
    const res = await fetch(
        `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`,
        { headers: buildHeaders(accessToken) }
    );
    // same !res.ok / IntegrationAuthError block

    const data = await res.json() as { results: NotionBlock[] };
    const text = data.results.map(blockToText).filter(Boolean).join("\n");
    return { externalId: pageId, body: text.slice(0, 20000), truncated: text.length > 20000 };
}
```

`blockToText` reads the `rich_text` array off whichever block type it is:

```ts
function blockToText(block: NotionBlock): string {
    const content = (block as any)[block.type];
    const richText = content?.rich_text as { plain_text: string }[] | undefined;
    if (!richText) return "";               // images, dividers, embeds: nothing to show
    return richText.map((t) => t.plain_text).join("");
}
```

**Deliberately not recursing into `has_children`.** Nested toggles and sub-bullets would mean one
more HTTP request per nested block, and a deep page turns into dozens of calls. Top-level blocks
are enough for a preview card. Revisit only if it actually feels lacking.

### Step 2.5: frontend

`client/lib/api/integrations.ts` — add alongside the six existing functions:

```ts
export function getIntegrationItemDetail(
    provider: IntegrationProvider,
    externalId: string
): Promise<IntegrationItemDetail> {
    return apiFetch(`/api/v1/integrations/items/${provider}/${encodeURIComponent(externalId)}`);
}
```

Then call it from the card's detail modal on open, with a small spinner. Nothing else in the
frontend changes: the list payload shape is untouched.

**Verify jobs 2 and 3:**

```bash
curl -H "Authorization: Bearer $JWT" \
  "http://localhost:8000/api/v1/integrations/items/gmail/<a real message id>"
```

Expect real email text in `data.body`. Repeat with `notion/<page id>`.

***

## Job 4: pagination

Three providers, three completely different schemes. Do **not** try to invent a unified cursor,
it is not worth it.

| Provider | Request param | Response field |
|-|-|-|
| GitHub | `page=2&per_page=30` | none, uses a `Link` header |
| Gmail | `pageToken=<token>` | `nextPageToken` |
| Notion | `start_cursor=<cursor>` in the POST body | `next_cursor`, `has_more` |

### The shape

Change the interface to pass a cursor in and hand one back:

```ts
export interface FetchResult {
    items: UniversalTask[];
    nextCursor?: string;   // undefined means no more pages
}

fetchItems(accessToken: string, cursor?: string): Promise<FetchResult>;
```

Each adapter interprets `cursor` in its own dialect: GitHub parses it as a page number, Gmail
passes it straight through as `pageToken`, Notion as `start_cursor`.

`getItems` then accepts `?cursor=` as **JSON of a per-provider map**, because the aggregate feed
advances each provider independently:

```
?cursor={"github":"2","gmail":"abc123"}
```

and returns `nextCursors` in the same shape. A provider missing from the map is on page one; a
provider missing from `nextCursors` is exhausted.

### Two things that will bite

**The Redis cache key must include the cursor.** `itemsCacheKey` at `integration.controller.ts:23`
is `integrations:items:<userId>:<generation>`. Page two would overwrite page one's cache entry and
users would see the wrong page. Append a hash of the cursor map.

**Gmail's N+1 gets worse, not better.** Page size 20 means 21 requests. Pagination does not fix
that, it just repeats it. If `/items` is still slow after this, the fix is a concurrency limit
(5 at a time instead of 20 via `Promise.all`) or dropping the page size, not more pagination.

***

## Order of work

1. GitHub filter fix + check the org grant page. Verify. **Ship it.**
2. `types.ts` interface change + the `getItemDetail` endpoint + route line. Verify with curl using a fake id, expect a clean 404.
3. Gmail `fetchDetail`. Verify with curl.
4. Notion `fetchDetail`. Verify with curl.
5. Frontend detail call in the card modal. Verify in the browser.
6. Pagination, only if the list actually feels slow.

Type check after each with `cd server && bun run build`.

Job 1 alone probably fixes the thing that is bothering you most. Do not start job 2 until job 1
shows an org repo on your board.

***

Sources for the GitHub behavior:
- [About OAuth app access restrictions](https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/about-oauth-app-access-restrictions)
- [Approving OAuth apps for your organization](https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/approving-oauth-apps-for-your-organization)
- [REST API endpoints for issues](https://docs.github.com/en/rest/issues/issues)
