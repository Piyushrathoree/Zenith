import { afterEach, describe, expect, test } from 'bun:test';
import {
    GitHubAdapter,
    isValidRepoSlug,
    mergeGitHubItems,
    parseNextPage,
    type GitHubIssueResponse,
} from './github.adapter.ts';
import { DEFAULT_SETTINGS } from '../integration.settings.ts';
import { InvalidCursorError, decodeCursor, encodeCursor, type EtagEntry, type EtagStore } from './types.ts';
import fixture from './fixtures/github-issues.json';

const assigned = fixture.assigned as GitHubIssueResponse[];
const created = fixture.created as GitHubIssueResponse[];
const reviews = fixture.reviews.items as GitHubIssueResponse[];

const realFetch = globalThis.fetch;
afterEach(() => {
    globalThis.fetch = realFetch;
});

type Handler = (url: string, init?: RequestInit) => Response;

function stubFetch(handler: Handler): string[] {
    const calls: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        calls.push(url);
        return handler(url, init);
    }) as typeof fetch;
    return calls;
}

function json(body: unknown, headers: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(body), { status: 200, headers });
}

function fixtureHandler(links: Record<string, string> = {}): Handler {
    return (url) => {
        const link = Object.entries(links).find(([key]) => url.includes(key))?.[1];
        const headers: Record<string, string> = link ? { link } : {};
        if (url.includes('/search/issues')) return json(fixture.reviews, headers);
        if (url.includes('filter=assigned')) return json(assigned, headers);
        if (url.includes('filter=created')) return json(created, headers);
        return new Response('not found', { status: 404 });
    };
}

describe('mergeGitHubItems', () => {
    test('dedupes by id and merges relations in first seen order', () => {
        const items = mergeGitHubItems([
            { relation: 'assigned', items: assigned },
            { relation: 'created', items: created },
            { relation: 'review_requested', items: reviews },
        ]);

        expect(items.map((item) => item.externalId)).toEqual(['101', '102', '103', '104']);
        const byId = Object.fromEntries(items.map((item) => [item.externalId, item]));
        expect(byId['101']!.githubRelation).toEqual(['assigned']);
        expect(byId['102']!.githubRelation).toEqual(['assigned', 'created', 'review_requested']);
        expect(byId['103']!.githubRelation).toEqual(['created']);
        expect(byId['104']!.githubRelation).toEqual(['review_requested']);
    });

    test('maps type, status, state and repository', () => {
        const [issue, pr, merged] = mergeGitHubItems([
            { relation: 'assigned', items: assigned },
            { relation: 'created', items: created },
        ]);
        expect(issue!.type).toBe('issue');
        expect(issue!.state).toBe('open');
        expect(issue!.repository).toBe('acme/web');
        expect(issue!.updatedAt).toBe('2026-10-10T10:00:00.000Z');
        expect(pr!.type).toBe('pr');
        expect(pr!.body).toBe('');
        expect(merged!.status).toBe('merged');
        expect(merged!.state).toBe('closed');
        expect(merged!.assignees).toEqual([]);
    });
});

describe('parseNextPage', () => {
    test('reads the rel="next" page number', () => {
        const link =
            '<https://api.github.com/issues?filter=assigned&page=3>; rel="next", ' +
            '<https://api.github.com/issues?filter=assigned&page=9>; rel="last"';
        expect(parseNextPage(link)).toBe(3);
    });

    test('no next link means no next page', () => {
        expect(parseNextPage('<https://api.github.com/issues?page=1>; rel="prev"')).toBeUndefined();
        expect(parseNextPage(null)).toBeUndefined();
    });
});

describe('GitHubAdapter.fetchItems', () => {
    test('calls assigned, created and review requests, then builds a cursor from Link headers', async () => {
        const calls = stubFetch(
            fixtureHandler({ 'filter=created': '<https://api.github.com/issues?filter=created&page=2>; rel="next"' })
        );

        const result = await new GitHubAdapter().fetchItems('token', { settings: DEFAULT_SETTINGS });

        expect(calls).toHaveLength(3);
        expect(calls.some((url) => url.includes('filter=assigned&state=open&per_page=50'))).toBe(true);
        expect(calls.some((url) => url.includes('filter=created&state=open&per_page=50'))).toBe(true);
        expect(calls.some((url) => url.includes('review-requested%3A%40me'))).toBe(true);
        expect(result.items).toHaveLength(4);
        expect(decodeCursor<object>(result.nextCursor!)).toEqual({ created: 2 });
    });

    test('a cursor fetches only the sources that have more pages', async () => {
        const calls = stubFetch(fixtureHandler());
        const result = await new GitHubAdapter().fetchItems('token', {
            settings: DEFAULT_SETTINGS,
            cursor: encodeCursor({ created: 2 }),
        });
        expect(calls).toEqual([expect.stringContaining('filter=created&state=open&per_page=50&page=2')]);
        expect(result.nextCursor).toBeUndefined();
    });

    test('githubIncludeReviews=false skips the search call', async () => {
        const calls = stubFetch(fixtureHandler());
        const result = await new GitHubAdapter().fetchItems('token', {
            settings: { ...DEFAULT_SETTINGS, githubIncludeReviews: false },
        });
        expect(calls.some((url) => url.includes('/search/issues'))).toBe(false);
        expect(result.items.map((item) => item.externalId)).toEqual(['101', '102', '103']);
    });

    test('rejects a malformed cursor', async () => {
        stubFetch(fixtureHandler());
        const adapter = new GitHubAdapter();
        await expect(
            adapter.fetchItems('token', { settings: DEFAULT_SETTINGS, cursor: 'not-a-cursor' })
        ).rejects.toBeInstanceOf(InvalidCursorError);
        await expect(
            adapter.fetchItems('token', { settings: DEFAULT_SETTINGS, cursor: encodeCursor({ created: -1 }) })
        ).rejects.toBeInstanceOf(InvalidCursorError);
    });

    test('a 304 reuses the stored body and Link header', async () => {
        const memory = new Map<string, EtagEntry>();
        const store: EtagStore = {
            get: async (url) => memory.get(url) ?? null,
            set: async (url, entry) => {
                memory.set(url, entry);
            },
        };
        const settings = { ...DEFAULT_SETTINGS, githubIncludeReviews: false };
        const link = '<https://api.github.com/issues?filter=assigned&page=2>; rel="next"';

        stubFetch((url) =>
            new Response(JSON.stringify(url.includes('assigned') ? assigned : created), {
                status: 200,
                headers: { etag: `"etag-${url.includes('assigned') ? 'a' : 'c'}"`, ...(url.includes('assigned') ? { link } : {}) },
            })
        );
        const first = await new GitHubAdapter().fetchItems('token', { settings, etagStore: store });
        expect(memory.size).toBe(2);

        const sentEtags: (string | null)[] = [];
        stubFetch((_url, init) => {
            sentEtags.push(new Headers(init?.headers).get('If-None-Match'));
            return new Response(null, { status: 304 });
        });
        const second = await new GitHubAdapter().fetchItems('token', { settings, etagStore: store });

        expect(sentEtags.sort()).toEqual(['"etag-a"', '"etag-c"']);
        expect(second.items).toEqual(first.items);
        expect(decodeCursor<object>(second.nextCursor!)).toEqual({ assigned: 2 });
    });

    test('a rate limited 403 is not an auth failure', async () => {
        stubFetch(() =>
            new Response('{"message":"API rate limit exceeded"}', {
                status: 403,
                headers: { 'x-ratelimit-remaining': '0' },
            })
        );
        await expect(
            new GitHubAdapter().fetchItems('token', { settings: DEFAULT_SETTINGS })
        ).rejects.toMatchObject({ name: 'IntegrationApiError', code: 'rate_limited' });
    });
});

describe('GitHubAdapter.fetchDetail', () => {
    test('returns the body and the last five comments', async () => {
        const comments = Array.from({ length: 7 }, (_, index) => ({
            body: `comment ${index + 1}`,
            created_at: `2026-10-0${index + 1}T00:00:00Z`,
            user: { login: `user${index + 1}`, avatar_url: '' },
        }));
        const calls = stubFetch((url) => {
            if (url.endsWith('/issues/7')) return json({ ...assigned[0], comments: 7 });
            const page = Number(new URL(url).searchParams.get('page'));
            return json(comments.slice((page - 1) * 5, page * 5));
        });

        const detail = await new GitHubAdapter().fetchDetail('token', '101', { repo: 'acme/web', number: 7 });

        expect(calls[0]).toBe('https://api.github.com/repos/acme/web/issues/7');
        expect(detail.body).toBe('Steps to reproduce');
        expect(detail.truncated).toBe(false);
        expect(detail.comments.map((comment) => comment.body)).toEqual([
            'comment 3',
            'comment 4',
            'comment 5',
            'comment 6',
            'comment 7',
        ]);
        expect(detail.comments[0]).toEqual({
            author: 'user3',
            body: 'comment 3',
            createdAt: '2026-10-03T00:00:00.000Z',
        });
    });

    test('repo slug validation', () => {
        expect(isValidRepoSlug('acme/web.app')).toBe(true);
        expect(isValidRepoSlug('acme/../secrets')).toBe(false);
        expect(isValidRepoSlug('acme/..')).toBe(false);
        expect(isValidRepoSlug('acme')).toBe(false);
        expect(isValidRepoSlug('https://evil.example/x')).toBe(false);
    });
});
