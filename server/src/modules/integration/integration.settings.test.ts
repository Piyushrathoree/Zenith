import { describe, expect, test } from 'bun:test';
import { DEFAULT_SETTINGS, applySettingsUpdate, resolveSettings, toIntegrationEntry } from './integration.settings.ts';

describe('applySettingsUpdate', () => {
    test('merges a partial update over the current settings', () => {
        const result = applySettingsUpdate('gmail', DEFAULT_SETTINGS, { gmailPreset: 'starred' });
        expect(result).toEqual({ ok: true, settings: { ...DEFAULT_SETTINGS, gmailPreset: 'starred' } });
    });

    test('rejects keys that belong to another provider', () => {
        const result = applySettingsUpdate('gmail', DEFAULT_SETTINGS, { notionMode: 'databases' });
        expect(result.ok).toBe(false);
    });

    test('the label preset needs a label id', () => {
        expect(applySettingsUpdate('gmail', DEFAULT_SETTINGS, { gmailPreset: 'label' }).ok).toBe(false);
        expect(
            applySettingsUpdate('gmail', DEFAULT_SETTINGS, { gmailPreset: 'label', gmailLabelId: 'Label_1' }).ok
        ).toBe(true);
    });

    test('notion database ids are validated and deduped', () => {
        const id = '1a2b3c4d-1111-2222-3333-444455556666';
        const result = applySettingsUpdate('notion', DEFAULT_SETTINGS, {
            notionMode: 'databases',
            notionDatabaseIds: [id, id],
        });
        expect(result.ok && result.settings.notionDatabaseIds).toEqual([id]);
        expect(applySettingsUpdate('notion', DEFAULT_SETTINGS, { notionDatabaseIds: ['../x'] }).ok).toBe(false);
    });

    test('github only accepts a boolean', () => {
        expect(applySettingsUpdate('github', DEFAULT_SETTINGS, { githubIncludeReviews: 'no' }).ok).toBe(false);
        const result = applySettingsUpdate('github', DEFAULT_SETTINGS, { githubIncludeReviews: false });
        expect(result.ok && result.settings.githubIncludeReviews).toBe(false);
    });
});

describe('toIntegrationEntry', () => {
    test('fills defaults for a document with no settings and nulls for missing health fields', () => {
        const date = new Date('2026-10-15T00:00:00.000Z');
        const entry = toIntegrationEntry({
            provider: 'github',
            status: 'active',
            profile: { username: 'piyush', avatar: '' },
            createdAt: date,
            updatedAt: date,
        });
        expect(entry).toEqual({
            provider: 'github',
            status: 'active',
            profile: { username: 'piyush', avatar: '' },
            expiresAt: undefined,
            createdAt: '2026-10-15T00:00:00.000Z',
            updatedAt: '2026-10-15T00:00:00.000Z',
            lastSyncedAt: null,
            lastError: null,
            lastErrorAt: null,
            settings: DEFAULT_SETTINGS,
        });
        expect(resolveSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    });
});
