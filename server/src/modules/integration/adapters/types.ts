export type IntegrationProvider = "github" | "gmail" | "notion";

export type UniversalTaskType = "issue" | "pr" | "email" | "page";

export interface UniversalTask {
    externalId: string;
    provider: IntegrationProvider;
    type: UniversalTaskType;
    title: string;
    link: string;
    status: string;
    createdAt?: string;
    body?: string;
    number?: number;
    repository?: string;
    author?: string;
    authorAvatar?: string;
    labels?: { name: string; color: string }[];
    assignees?: { login: string; avatar_url: string }[];
    threadId?: string;
    from?: string;
    fromEmail?: string;
    snippet?: string;
    unread?: boolean;
    icon?: string;
    workspace?: string;
    lastEdited?: string;
    // Phase 12 additions, all optional so older clients keep working.
    dueDate?: string; // YYYY-MM-DD
    state?: UniversalTaskState;
    updatedAt?: string;
    githubRelation?: GitHubRelation[];
}

export type UniversalTaskState = "open" | "closed" | "done" | "archived";

export type GitHubRelation = "assigned" | "created" | "review_requested";

export interface IntegrationProfile {
    username: string;
    avatar: string;
}

// Per user, per provider choices made in the Configure screen. Stored on the
// Integration document; see integration.settings.ts for defaults.
export type GmailPreset = "inbox" | "starred" | "unread" | "important" | "label";
export type NotionMode = "pages" | "databases";

export interface IntegrationSettings {
    gmailPreset: GmailPreset;
    gmailLabelId?: string;
    notionMode: NotionMode;
    notionDatabaseIds: string[];
    githubIncludeReviews: boolean;
}

// A cached conditional GET response. `link` is kept so a 304 still knows
// whether there is a next page.
export interface EtagEntry {
    etag: string;
    body: string;
    link: string | null;
}

// Storage for ETag based conditional requests. Implementations must never
// throw: a store failure means "no cached entry", never a failed fetch.
export interface EtagStore {
    get(url: string): Promise<EtagEntry | null>;
    set(url: string, entry: EtagEntry): Promise<void>;
}

export interface FetchContext {
    settings: IntegrationSettings;
    cursor?: string;
    etagStore?: EtagStore;
}

export interface FetchResult {
    items: UniversalTask[];
    nextCursor?: string; // undefined means no more pages
}

export interface IntegrationItemComment {
    author: string;
    body: string;
    createdAt: string;
}

export interface IntegrationItemDetail {
    externalId: string;
    body: string;
    truncated: boolean;
    comments: IntegrationItemComment[];
}

// Extra lookup data some providers need for a detail fetch (GitHub needs
// the repo and issue number, its list id alone cannot address an issue).
export interface DetailParams {
    repo?: string;
    number?: number;
}

export interface IntegrationAdapter {
    fetchItems(accessToken: string, context: FetchContext): Promise<FetchResult>;
    fetchProfile(accessToken: string): Promise<IntegrationProfile>;
    fetchDetail(
        accessToken: string,
        externalId: string,
        params: DetailParams
    ): Promise<IntegrationItemDetail>;
    fetchOptions(accessToken: string): Promise<Record<string, unknown>>;
}

export const DETAIL_BODY_LIMIT = 20000;

export function truncateBody(text: string): { body: string; truncated: boolean } {
    return {
        body: text.slice(0, DETAIL_BODY_LIMIT),
        truncated: text.length > DETAIL_BODY_LIMIT,
    };
}

// A 401 or 403 from a provider means the user revoked access or the token
// died, not a transient hiccup. Callers use instanceof to tell the two
// apart: this error should mark the stored integration as revoked so the
// UI can prompt a reconnect, every other failure must not revoke anything.
export class IntegrationAuthError extends Error {
    readonly status: number;
    constructor(provider: string, status: number, detail?: string) {
        const base = `${provider} authorization failed with status ${status}`;
        super(detail ? `${base}: ${detail}` : base);
        this.name = "IntegrationAuthError";
        this.status = status;
    }
}

// Short codes the UI can act on. Stored as Integration.lastError and returned
// with each items error.
export type IntegrationErrorCode =
    | "needs_reconnect"
    | "rate_limited"
    | "org_access"
    | "provider_down";

export const INTEGRATION_ERROR_CODES: readonly IntegrationErrorCode[] = [
    "needs_reconnect",
    "rate_limited",
    "org_access",
    "provider_down",
];

// Any provider failure that is not an auth failure. `code` is decided at the
// point the response is read, where headers and body are still available.
export class IntegrationApiError extends Error {
    readonly status: number;
    readonly code: IntegrationErrorCode;
    constructor(
        provider: string,
        status: number,
        code: IntegrationErrorCode,
        detail?: string
    ) {
        const base = `${provider} API error ${status}`;
        super(detail ? `${base}: ${detail}` : base);
        this.name = "IntegrationApiError";
        this.status = status;
        this.code = code;
    }
}

// Thrown by an adapter when the client sent a cursor it cannot decode.
export class InvalidCursorError extends Error {
    constructor() {
        super("Invalid cursor");
        this.name = "InvalidCursorError";
    }
}

/**
 * Decides what a non 2xx provider response means. Pure, so it is unit tested.
 * - 429, or a 403 that is really a rate limit (GitHub sends 403 with
 *   x-ratelimit-remaining: 0; Gmail sends 403 with a rateLimitExceeded
 *   reason), is rate_limited and must never revoke anything.
 * - A GitHub 403 carrying x-github-sso means an org has not authorized this
 *   token (SAML SSO): org_access.
 * - Any other 401 or 403 is an auth failure: the integration needs a reconnect.
 * - Everything else is provider_down.
 */
export function classifyHttpFailure(
    provider: string,
    status: number,
    headers: { get(name: string): string | null },
    bodyText: string
): IntegrationAuthError | IntegrationApiError {
    if (status === 429) {
        return new IntegrationApiError(provider, status, "rate_limited", "rate limited");
    }
    if (status === 403) {
        const remaining = headers.get("x-ratelimit-remaining");
        if (
            remaining === "0" ||
            headers.get("retry-after") !== null ||
            /rate ?limit/i.test(bodyText)
        ) {
            return new IntegrationApiError(provider, status, "rate_limited", "rate limited");
        }
        if (provider === "github" && headers.get("x-github-sso")) {
            return new IntegrationApiError(
                provider,
                status,
                "org_access",
                "an organization requires SSO authorization for this token"
            );
        }
    }
    if (status === 401 || status === 403) {
        return new IntegrationAuthError(provider, status);
    }
    return new IntegrationApiError(provider, status, "provider_down");
}

/** Reads a failed response and throws the classified error. */
export async function throwForResponse(
    provider: string,
    res: Response,
    what: string
): Promise<never> {
    let bodyText = "";
    try {
        bodyText = await res.text();
    } catch {
        bodyText = "";
    }
    const error = classifyHttpFailure(provider, res.status, res.headers, bodyText);
    error.message = `${error.message} (${what})`;
    throw error;
}

/** Maps any thrown value to the code the UI understands. */
export function errorCodeFor(error: unknown): IntegrationErrorCode {
    if (error instanceof IntegrationAuthError) return "needs_reconnect";
    if (error instanceof IntegrationApiError) return error.code;
    return "provider_down";
}

// Cursors handed to the client are opaque: base64url JSON. Decoding returns
// null for anything malformed so adapters can reject it cleanly.
export function encodeCursor(value: unknown): string {
    return Buffer.from(JSON.stringify(value), "utf-8").toString("base64url");
}

export function decodeCursor<T>(cursor: string): T | null {
    try {
        const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"));
        return parsed && typeof parsed === "object" ? (parsed as T) : null;
    } catch {
        return null;
    }
}

/** Runs `fn` over `items` with at most `limit` calls in flight, keeping order. */
export async function mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<R>
): Promise<R[]> {
    const results = new Array<R>(items.length);
    let next = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (next < items.length) {
            const index = next++;
            results[index] = await fn(items[index]!);
        }
    });
    await Promise.all(workers);
    return results;
}

// Builds a valid ISO date string from a provider supplied value, never an
// empty or malformed one. Tries the value as given, then falls back to now.
// A blank or unparseable createdAt reaches the client as new Date(""),
// which date-fns throws a RangeError on and blanks the whole route.
export function toIsoDate(value: unknown): string {
    if (typeof value === "string" && value.length > 0) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString();
        }
    }

    if (typeof value === "number" && !Number.isNaN(value)) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString();
        }
    }

    return new Date().toISOString();
}
