import type { RedisOptions } from "ioredis";
import { env } from "./env.ts";

/**
 * Shared Redis connection options for ioredis + BullMQ.
 *
 * Prefer REDIS_URL (local or Upstash). Upstash needs TLS; their CLI often shows
 * `redis://...` with a separate `--tls` flag — we enable TLS automatically for
 * `rediss://` URLs and for `*.upstash.io` hosts.
 */
export function getRedisOptions(): RedisOptions {
    if (env.REDIS_URL) {
        const useTls =
            env.REDIS_URL.startsWith("rediss://") ||
            env.REDIS_URL.includes("upstash.io");
        // URL() needs redis:// (not rediss://) to parse host/user/password.
        const parsable = env.REDIS_URL.replace(/^rediss:\/\//, "redis://");
        const parsed = new URL(parsable);

        return {
            host: parsed.hostname,
            port: Number(parsed.port || 6379),
            username: parsed.username || undefined,
            password: parsed.password
                ? decodeURIComponent(parsed.password)
                : undefined,
            ...(useTls ? { tls: {} } : {}),
            maxRetriesPerRequest: null,
        };
    }

    return {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        maxRetriesPerRequest: null,
    };
}
