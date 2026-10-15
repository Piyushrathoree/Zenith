import { describe, expect, test } from 'bun:test';
import {
    IntegrationApiError,
    IntegrationAuthError,
    classifyHttpFailure,
    decodeCursor,
    encodeCursor,
    errorCodeFor,
    mapWithConcurrency,
    truncateBody,
} from './types.ts';

const headers = (values: Record<string, string> = {}) => new Headers(values);

describe('classifyHttpFailure and errorCodeFor', () => {
    test('401 is needs_reconnect for every provider', () => {
        for (const provider of ['github', 'gmail', 'notion']) {
            const error = classifyHttpFailure(provider, 401, headers(), '');
            expect(error).toBeInstanceOf(IntegrationAuthError);
            expect(errorCodeFor(error)).toBe('needs_reconnect');
        }
    });

    test('429 is rate_limited', () => {
        expect(errorCodeFor(classifyHttpFailure('notion', 429, headers(), ''))).toBe('rate_limited');
    });

    test('GitHub 403 with no remaining quota is rate_limited, not a revocation', () => {
        const error = classifyHttpFailure('github', 403, headers({ 'x-ratelimit-remaining': '0' }), '');
        expect(error).toBeInstanceOf(IntegrationApiError);
        expect(errorCodeFor(error)).toBe('rate_limited');
    });

    test('Gmail 403 with a rateLimitExceeded reason is rate_limited', () => {
        const body = '{"error":{"errors":[{"reason":"userRateLimitExceeded"}]}}';
        expect(errorCodeFor(classifyHttpFailure('gmail', 403, headers(), body))).toBe('rate_limited');
    });

    test('GitHub 403 with x-github-sso is org_access', () => {
        const error = classifyHttpFailure('github', 403, headers({ 'x-github-sso': 'required; url=https://x' }), '');
        expect(errorCodeFor(error)).toBe('org_access');
    });

    test('a plain 403 is an auth failure', () => {
        expect(errorCodeFor(classifyHttpFailure('gmail', 403, headers(), '{"reason":"insufficientPermissions"}'))).toBe(
            'needs_reconnect'
        );
    });

    test('5xx and unknown errors are provider_down', () => {
        expect(errorCodeFor(classifyHttpFailure('notion', 502, headers(), ''))).toBe('provider_down');
        expect(errorCodeFor(new Error('socket hang up'))).toBe('provider_down');
        expect(errorCodeFor('weird')).toBe('provider_down');
    });
});

describe('cursors', () => {
    test('round trip and reject garbage', () => {
        expect(decodeCursor<object>(encodeCursor({ created: 2 }))).toEqual({ created: 2 });
        expect(decodeCursor('%%%')).toBeNull();
        expect(decodeCursor(encodeCursor('a string'))).toBeNull();
    });
});

describe('helpers', () => {
    test('truncateBody', () => {
        expect(truncateBody('abc')).toEqual({ body: 'abc', truncated: false });
        const long = truncateBody('x'.repeat(20001));
        expect(long.body.length).toBe(20000);
        expect(long.truncated).toBe(true);
    });

    test('mapWithConcurrency keeps order and respects the limit', async () => {
        let running = 0;
        let peak = 0;
        const result = await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (value) => {
            running++;
            peak = Math.max(peak, running);
            await new Promise((resolve) => setTimeout(resolve, 5));
            running--;
            return value * 10;
        });
        expect(result).toEqual([10, 20, 30, 40, 50, 60]);
        expect(peak).toBe(2);
    });
});
