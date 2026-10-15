import type {
    DetailParams,
    EtagStore,
    FetchContext,
    FetchResult,
    GitHubRelation,
    IntegrationAdapter,
    IntegrationItemComment,
    IntegrationItemDetail,
    IntegrationProfile,
    UniversalTask,
    UniversalTaskState,
} from "./types.ts";
import {
    InvalidCursorError,
    decodeCursor,
    encodeCursor,
    throwForResponse,
    toIsoDate,
    truncateBody,
} from "./types.ts";

// GitHub's REST API base URL and the headers every request needs.
const GITHUB_API_BASE = "https://api.github.com";
const PAGE_SIZE = 50;
const MAX_PAGE = 100;
const DETAIL_COMMENT_COUNT = 5;

interface GitHubUser {
    login: string;
    avatar_url: string;
}

interface GitHubLabel {
    name: string;
    color: string;
}

interface GitHubPullRequestRef {
    url: string;
    merged_at?: string | null;
}

export interface GitHubIssueResponse {
    id: number;
    number: number;
    title: string;
    html_url: string;
    state: string;
    repository_url: string;
    created_at: string;
    updated_at?: string;
    body: string | null;
    user: GitHubUser | null;
    labels: GitHubLabel[];
    assignees: GitHubUser[] | null;
    pull_request?: GitHubPullRequestRef;
    comments?: number;
}

interface GitHubSearchResponse {
    items: GitHubIssueResponse[];
}

interface GitHubCommentResponse {
    body: string | null;
    created_at: string;
    user: GitHubUser | null;
}

interface GitHubUserResponse {
    login: string;
    avatar_url: string | null;
}

function buildHeaders(accessToken: string): Record<string, string> {
    return {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "zenith-app",
    };
}

function parseRepositorySlug(repositoryUrl: string): string {
    const parts = repositoryUrl.split("/repos/");
    return parts[1] ?? "";
}

// The three item sources. Each pages independently, so the cursor holds the next page number
// per source. Page numbers, not URLs: a client supplied URL must never receive our token.
type GitHubCursor = Partial<Record<GitHubRelation, number>>;

export function sourceUrl(source: GitHubRelation, page: number): string {
    if (source === "review_requested") {
        const q = encodeURIComponent("is:open is:pr review-requested:@me");
        return `${GITHUB_API_BASE}/search/issues?q=${q}&per_page=${PAGE_SIZE}&page=${page}`;
    }
    return `${GITHUB_API_BASE}/issues?filter=${source}&state=open&per_page=${PAGE_SIZE}&page=${page}`;
}

/** The page number of the rel="next" link in a GitHub Link header, if any. */
export function parseNextPage(link: string | null): number | undefined {
    if (!link) return undefined;
    for (const part of link.split(",")) {
        const match = part.match(/<([^>]+)>\s*;\s*rel="next"/);
        if (!match) continue;
        try {
            const page = Number(new URL(match[1]!).searchParams.get("page"));
            return Number.isInteger(page) && page > 0 ? page : undefined;
        } catch {
            return undefined;
        }
    }
    return undefined;
}

function issueState(item: GitHubIssueResponse): UniversalTaskState {
    // A merged PR is closed as far as planning goes.
    return item.state === "open" && !item.pull_request?.merged_at ? "open" : "closed";
}

export function mapGitHubIssue(
    item: GitHubIssueResponse,
    relations: GitHubRelation[]
): UniversalTask {
    const isPullRequest = Boolean(item.pull_request);
    const status =
        isPullRequest && item.pull_request?.merged_at ? "merged" : item.state;

    return {
        externalId: String(item.id),
        provider: "github",
        type: isPullRequest ? "pr" : "issue",
        title: item.title,
        link: item.html_url,
        status,
        state: issueState(item),
        createdAt: toIsoDate(item.created_at),
        updatedAt: item.updated_at ? toIsoDate(item.updated_at) : undefined,
        body: item.body ?? "",
        number: item.number,
        repository: parseRepositorySlug(item.repository_url),
        author: item.user?.login,
        authorAvatar: item.user?.avatar_url,
        labels: (item.labels ?? []).map((label) => ({
            name: label.name,
            color: label.color,
        })),
        assignees: (item.assignees ?? []).map((assignee) => ({
            login: assignee.login,
            avatar_url: assignee.avatar_url,
        })),
        githubRelation: relations,
    };
}

/**
 * Merges the per source lists into one, deduped by GitHub id. An item found by more than one
 * source keeps its first position and collects every relation, for example a PR you opened and
 * were asked to review is ["created", "review_requested"].
 */
export function mergeGitHubItems(
    sources: { relation: GitHubRelation; items: GitHubIssueResponse[] }[]
): UniversalTask[] {
    const byId = new Map<number, { item: GitHubIssueResponse; relations: GitHubRelation[] }>();
    for (const source of sources) {
        for (const item of source.items) {
            const existing = byId.get(item.id);
            if (existing) {
                if (!existing.relations.includes(source.relation)) {
                    existing.relations.push(source.relation);
                }
            } else {
                byId.set(item.id, { item, relations: [source.relation] });
            }
        }
    }
    return [...byId.values()].map(({ item, relations }) => mapGitHubIssue(item, relations));
}

/**
 * GET with ETag / If-None-Match. A 304 reuses the stored body and Link header and does not
 * count against GitHub's rate limit. The store is optional and never throws.
 */
async function conditionalGet<T>(
    url: string,
    accessToken: string,
    etagStore: EtagStore | undefined
): Promise<{ body: T; link: string | null }> {
    const cached = etagStore ? await etagStore.get(url) : null;
    const headers = buildHeaders(accessToken);
    if (cached) headers["If-None-Match"] = cached.etag;

    const res = await fetch(url, { headers });

    if (res.status === 304 && cached) {
        return { body: JSON.parse(cached.body) as T, link: cached.link };
    }
    if (!res.ok) {
        await throwForResponse("github", res, "fetching items");
    }

    const text = await res.text();
    const link = res.headers.get("link");
    const etag = res.headers.get("etag");
    if (etag && etagStore) {
        await etagStore.set(url, { etag, body: text, link });
    }
    return { body: JSON.parse(text) as T, link };
}

async function fetchSource(
    accessToken: string,
    source: GitHubRelation,
    page: number,
    etagStore: EtagStore | undefined
): Promise<{ items: GitHubIssueResponse[]; nextPage?: number }> {
    const url = sourceUrl(source, page);
    if (source === "review_requested") {
        const { body, link } = await conditionalGet<GitHubSearchResponse>(url, accessToken, etagStore);
        return { items: body.items ?? [], nextPage: parseNextPage(link) };
    }
    const { body, link } = await conditionalGet<GitHubIssueResponse[]>(url, accessToken, etagStore);
    return { items: Array.isArray(body) ? body : [], nextPage: parseNextPage(link) };
}

function decodeGitHubCursor(cursor: string): GitHubCursor {
    const decoded = decodeCursor<GitHubCursor>(cursor);
    if (!decoded) throw new InvalidCursorError();
    const result: GitHubCursor = {};
    for (const key of ["assigned", "created", "review_requested"] as const) {
        const page = decoded[key];
        if (page === undefined) continue;
        if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) throw new InvalidCursorError();
        result[key] = page;
    }
    return result;
}

const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/;

export function isValidRepoSlug(repo: string): boolean {
    // "." and ".." would be resolved as path segments by the URL parser.
    return REPO_PATTERN.test(repo) && !repo.split("/").some((part) => /^\.+$/.test(part));
}

function repoPath(repo: string): string {
    return repo.split("/").map(encodeURIComponent).join("/");
}

export class GitHubAdapter implements IntegrationAdapter {
    async fetchItems(accessToken: string, context: FetchContext): Promise<FetchResult> {
        const pages: GitHubCursor = context.cursor
            ? decodeGitHubCursor(context.cursor)
            : { assigned: 1, created: 1, review_requested: 1 };
        if (!context.settings.githubIncludeReviews) {
            delete pages.review_requested;
        }

        const sources = (Object.keys(pages) as GitHubRelation[]).filter(
            (source) => pages[source] !== undefined
        );
        const results = await Promise.all(
            sources.map(async (source) => ({
                relation: source,
                ...(await fetchSource(accessToken, source, pages[source]!, context.etagStore)),
            }))
        );

        const next: GitHubCursor = {};
        for (const result of results) {
            if (result.nextPage !== undefined) next[result.relation] = result.nextPage;
        }

        return {
            items: mergeGitHubItems(results),
            nextCursor: Object.keys(next).length > 0 ? encodeCursor(next) : undefined,
        };
    }

    async fetchDetail(
        accessToken: string,
        externalId: string,
        params: DetailParams
    ): Promise<IntegrationItemDetail> {
        if (!params.repo || !isValidRepoSlug(params.repo) || !params.number) {
            throw new Error("GitHub detail needs a valid repo and issue number");
        }
        const base = `${GITHUB_API_BASE}/repos/${repoPath(params.repo)}/issues/${params.number}`;

        const issueRes = await fetch(base, { headers: buildHeaders(accessToken) });
        if (!issueRes.ok) {
            await throwForResponse("github", issueRes, "fetching issue");
        }
        const issue = (await issueRes.json()) as GitHubIssueResponse;

        // The comments endpoint is oldest first with no sort option, so the latest comments are
        // on the last page. Fetch that page, plus the one before when it is short.
        const count = issue.comments ?? 0;
        let raw: GitHubCommentResponse[] = [];
        if (count > 0) {
            const lastPage = Math.ceil(count / DETAIL_COMMENT_COUNT);
            const wanted = lastPage > 1 && count % DETAIL_COMMENT_COUNT !== 0
                ? [lastPage - 1, lastPage]
                : [lastPage];
            const pagesOfComments = await Promise.all(
                wanted.map(async (page) => {
                    const res = await fetch(
                        `${base}/comments?per_page=${DETAIL_COMMENT_COUNT}&page=${page}`,
                        { headers: buildHeaders(accessToken) }
                    );
                    if (!res.ok) {
                        await throwForResponse("github", res, "fetching comments");
                    }
                    return (await res.json()) as GitHubCommentResponse[];
                })
            );
            raw = pagesOfComments.flat().slice(-DETAIL_COMMENT_COUNT);
        }

        const comments: IntegrationItemComment[] = raw.map((comment) => ({
            author: comment.user?.login ?? "",
            body: comment.body ?? "",
            createdAt: toIsoDate(comment.created_at),
        }));

        return {
            externalId,
            ...truncateBody(issue.body ?? ""),
            comments,
        };
    }

    async fetchOptions(): Promise<Record<string, unknown>> {
        return {};
    }

    async fetchProfile(accessToken: string): Promise<IntegrationProfile> {
        const res = await fetch(`${GITHUB_API_BASE}/user`, {
            headers: buildHeaders(accessToken),
        });

        if (!res.ok) {
            await throwForResponse("github", res, "fetching profile");
        }

        const data = (await res.json()) as GitHubUserResponse;

        return {
            username: data.login,
            avatar: data.avatar_url ?? "",
        };
    }
}
