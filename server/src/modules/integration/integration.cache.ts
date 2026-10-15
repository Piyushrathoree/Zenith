import { createHash } from 'node:crypto';
import { redisClient } from '../../middleware/rateLimit.middleware.ts';
import type {
    EtagEntry,
    EtagStore,
    IntegrationItemDetail,
    IntegrationProvider,
    UniversalTask,
} from './adapters/types.ts';

// Every Redis read and write in this file fails OPEN: a Redis outage costs speed, never
// correctness. (The OAuth state nonce in the controller is the one place that fails closed.)

const cacheRedis = redisClient;

const ITEMS_CACHE_TTL_SECONDS = 90;
const DETAIL_CACHE_TTL_SECONDS = 300;
const ETAG_TTL_SECONDS = 24 * 60 * 60;

// ─── Items cache, per user and per provider ──────────────────────────────────
// Each (user, provider) pair has a generation counter. Entries are keyed by the generation, and
// invalidating INCRs the counter rather than deleting the entry. A request captures the
// generation before its live fetch and writes under that same generation, so a disconnect or a
// settings change that lands while the fetch is in flight orphans the write instead of racing it.

export interface ProviderItemsEntry {
    items: UniversalTask[];
    nextCursor?: string;
}

function generationKey(userId: string, provider: IntegrationProvider): string {
    return `integrations:items:gen:${userId}:${provider}`;
}

function itemsKey(userId: string, provider: IntegrationProvider, generation: number): string {
    return `integrations:items:${userId}:${provider}:${generation}`;
}

export async function currentGeneration(userId: string, provider: IntegrationProvider): Promise<number> {
    try {
        const raw = await cacheRedis.get(generationKey(userId, provider));
        return raw ? parseInt(raw, 10) || 0 : 0;
    } catch (error) {
        console.warn('[Integrations] Cache generation read failed, defaulting to 0:', error);
        return 0;
    }
}

export async function readProviderItems(
    userId: string,
    provider: IntegrationProvider,
    generation: number
): Promise<ProviderItemsEntry | null> {
    try {
        const raw = await cacheRedis.get(itemsKey(userId, provider, generation));
        return raw ? (JSON.parse(raw) as ProviderItemsEntry) : null;
    } catch (error) {
        console.warn('[Integrations] Cache read failed, falling back to a live fetch:', error);
        return null;
    }
}

/** Only ever called with a successful first page: errors and cursor pages are never cached. */
export async function writeProviderItems(
    userId: string,
    provider: IntegrationProvider,
    generation: number,
    entry: ProviderItemsEntry
): Promise<void> {
    try {
        await cacheRedis.set(
            itemsKey(userId, provider, generation),
            JSON.stringify(entry),
            'EX',
            ITEMS_CACHE_TTL_SECONDS
        );
    } catch (error) {
        console.warn('[Integrations] Cache write failed:', error);
    }
}

export async function invalidateProviderItems(userId: string, provider: IntegrationProvider): Promise<void> {
    try {
        await cacheRedis.incr(generationKey(userId, provider));
    } catch (error) {
        console.warn('[Integrations] Cache invalidation failed:', error);
    }
}

// ─── Detail cache ────────────────────────────────────────────────────────────

function detailKey(userId: string, provider: IntegrationProvider, cacheId: string): string {
    return `integrations:detail:${userId}:${provider}:${cacheId}`;
}

export async function readDetail(
    userId: string,
    provider: IntegrationProvider,
    cacheId: string
): Promise<IntegrationItemDetail | null> {
    try {
        const raw = await cacheRedis.get(detailKey(userId, provider, cacheId));
        return raw ? (JSON.parse(raw) as IntegrationItemDetail) : null;
    } catch (error) {
        console.warn('[Integrations] Detail cache read failed:', error);
        return null;
    }
}

export async function writeDetail(
    userId: string,
    provider: IntegrationProvider,
    cacheId: string,
    detail: IntegrationItemDetail
): Promise<void> {
    try {
        await cacheRedis.set(
            detailKey(userId, provider, cacheId),
            JSON.stringify(detail),
            'EX',
            DETAIL_CACHE_TTL_SECONDS
        );
    } catch (error) {
        console.warn('[Integrations] Detail cache write failed:', error);
    }
}

// ─── ETag store (GitHub conditional requests) ────────────────────────────────

/** A per user ETag store. Keyed by user and a hash of the URL, so tokens never share bodies. */
export function createEtagStore(userId: string, provider: IntegrationProvider): EtagStore {
    const keyFor = (url: string) =>
        `integrations:etag:${provider}:${userId}:${createHash('sha1').update(url).digest('hex')}`;

    return {
        async get(url: string): Promise<EtagEntry | null> {
            try {
                const raw = await cacheRedis.get(keyFor(url));
                return raw ? (JSON.parse(raw) as EtagEntry) : null;
            } catch (error) {
                console.warn('[Integrations] ETag read failed:', error);
                return null;
            }
        },
        async set(url: string, entry: EtagEntry): Promise<void> {
            try {
                await cacheRedis.set(keyFor(url), JSON.stringify(entry), 'EX', ETAG_TTL_SECONDS);
            } catch (error) {
                console.warn('[Integrations] ETag write failed:', error);
            }
        },
    };
}
