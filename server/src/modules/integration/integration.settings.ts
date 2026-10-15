import { z } from 'zod';
import type {
    IntegrationErrorCode,
    IntegrationProvider,
    IntegrationSettings,
} from './adapters/types.ts';

// Pure helpers for integration settings and the GET /integrations entry shape. Kept free of
// Mongoose, env and Redis imports so they can be unit tested.

export const DEFAULT_SETTINGS: IntegrationSettings = {
    gmailPreset: 'inbox',
    notionMode: 'pages',
    notionDatabaseIds: [],
    githubIncludeReviews: true,
};

/**
 * Fills defaults for any missing key. Needed because `.lean()` reads skip schema defaults, so a
 * document created before Phase 12 has no settings subdocument at all.
 */
export function resolveSettings(raw: Partial<IntegrationSettings> | null | undefined): IntegrationSettings {
    const source = raw ?? {};
    return {
        gmailPreset: source.gmailPreset ?? DEFAULT_SETTINGS.gmailPreset,
        gmailLabelId: source.gmailLabelId || undefined,
        notionMode: source.notionMode ?? DEFAULT_SETTINGS.notionMode,
        notionDatabaseIds: Array.isArray(source.notionDatabaseIds) ? [...source.notionDatabaseIds] : [],
        githubIncludeReviews: source.githubIncludeReviews ?? DEFAULT_SETTINGS.githubIncludeReviews,
    };
}

// Notion ids are UUIDs, with or without dashes. Validated because they are put into a URL path.
const notionIdSchema = z.string().regex(/^[0-9a-fA-F-]{32,36}$/, 'Invalid Notion database id');

// One strict schema per provider: a key that belongs to another provider is rejected with 400.
export const SETTINGS_SCHEMAS = {
    gmail: z
        .object({
            gmailPreset: z.enum(['inbox', 'starred', 'unread', 'important', 'label']).optional(),
            gmailLabelId: z.string().min(1).max(200).optional(),
        })
        .strict(),
    notion: z
        .object({
            notionMode: z.enum(['pages', 'databases']).optional(),
            notionDatabaseIds: z.array(notionIdSchema).max(20).optional(),
        })
        .strict(),
    github: z
        .object({
            githubIncludeReviews: z.boolean().optional(),
        })
        .strict(),
} as const;

export type SettingsValidation =
    | { ok: true; settings: IntegrationSettings }
    | { ok: false; message: string };

/** Validates a PUT body for one provider and merges it over the current settings. */
export function applySettingsUpdate(
    provider: IntegrationProvider,
    current: IntegrationSettings,
    body: unknown
): SettingsValidation {
    const parsed = SETTINGS_SCHEMAS[provider].safeParse(body ?? {});
    if (!parsed.success) {
        const message = parsed.error.issues
            .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
            .join('; ');
        return { ok: false, message };
    }

    const merged: IntegrationSettings = { ...current };
    for (const [key, value] of Object.entries(parsed.data)) {
        if (value !== undefined) {
            (merged as unknown as Record<string, unknown>)[key] = value;
        }
    }

    if (provider === 'gmail' && merged.gmailPreset === 'label' && !merged.gmailLabelId) {
        return { ok: false, message: 'gmailLabelId is required when gmailPreset is "label"' };
    }
    if (provider === 'notion') {
        merged.notionDatabaseIds = [...new Set(merged.notionDatabaseIds)];
    }

    return { ok: true, settings: merged };
}

export interface IntegrationEntrySource {
    provider: IntegrationProvider;
    status: 'active' | 'expired' | 'revoked';
    profile: { username: string; avatar: string };
    expiresAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    lastSyncedAt?: Date | null;
    lastError?: IntegrationErrorCode | null;
    lastErrorAt?: Date | null;
    settings?: Partial<IntegrationSettings> | null;
}

export interface IntegrationEntry {
    provider: IntegrationProvider;
    status: 'active' | 'expired' | 'revoked';
    profile: { username: string; avatar: string };
    expiresAt?: string;
    createdAt: string;
    updatedAt: string;
    lastSyncedAt: string | null;
    lastError: IntegrationErrorCode | null;
    lastErrorAt: string | null;
    settings: IntegrationSettings;
}

/** The single serializer for GET /integrations and PUT /:provider/settings. Never includes tokens. */
export function toIntegrationEntry(doc: IntegrationEntrySource): IntegrationEntry {
    return {
        provider: doc.provider,
        status: doc.status,
        profile: { username: doc.profile?.username ?? '', avatar: doc.profile?.avatar ?? '' },
        expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : undefined,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        lastSyncedAt: doc.lastSyncedAt ? doc.lastSyncedAt.toISOString() : null,
        lastError: doc.lastError ?? null,
        lastErrorAt: doc.lastErrorAt ? doc.lastErrorAt.toISOString() : null,
        settings: resolveSettings(doc.settings),
    };
}
