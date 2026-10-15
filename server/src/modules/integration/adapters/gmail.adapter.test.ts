import { afterEach, describe, expect, test } from 'bun:test';
import {
    GmailAdapter,
    buildListQuery,
    extractPlainText,
    htmlToText,
    parseFromHeader,
    type GmailPart,
} from './gmail.adapter.ts';
import { DEFAULT_SETTINGS } from '../integration.settings.ts';
import multipart from './fixtures/gmail-multipart.json';
import htmlOnly from './fixtures/gmail-html-only.json';

const realFetch = globalThis.fetch;
afterEach(() => {
    globalThis.fetch = realFetch;
});

describe('extractPlainText', () => {
    test('nested multipart prefers text/plain anywhere in the tree and skips attachments', () => {
        const text = extractPlainText(multipart.payload as GmailPart);
        expect(text).toBe('Hi Piyush,\nThe report is ready. Café ☕');
        expect(text).not.toContain('attachment');
    });

    test('falls back to text/html stripped to text', () => {
        const text = extractPlainText(htmlOnly.payload as GmailPart);
        expect(text).toContain('Hello & welcome');
        expect(text).toContain('- One');
        expect(text).toContain('© 2026');
        expect(text).not.toContain('color:red');
        expect(text).not.toContain('alert');
        expect(text).not.toContain('<');
    });

    test('a single part message and an empty payload', () => {
        const data = Buffer.from('just text').toString('base64url');
        expect(extractPlainText({ mimeType: 'text/plain', body: { data } })).toBe('just text');
        expect(extractPlainText(undefined)).toBe('');
    });
});

describe('htmlToText', () => {
    test('decodes entities and collapses blank lines', () => {
        expect(htmlToText('<p>a &lt;b&gt; &#x41;</p><p></p><p></p><p>c</p>')).toBe('a <b> A\n\nc');
    });
});

describe('buildListQuery', () => {
    test('maps each preset to labelIds or q', () => {
        const query = (overrides: Partial<typeof DEFAULT_SETTINGS>) =>
            buildListQuery({ ...DEFAULT_SETTINGS, ...overrides }).toString();
        expect(query({})).toBe('maxResults=25&labelIds=INBOX');
        expect(query({ gmailPreset: 'starred' })).toBe('maxResults=25&labelIds=STARRED');
        expect(query({ gmailPreset: 'important' })).toBe('maxResults=25&labelIds=IMPORTANT');
        expect(query({ gmailPreset: 'unread' })).toBe('maxResults=25&q=is%3Aunread+in%3Ainbox');
        expect(query({ gmailPreset: 'label', gmailLabelId: 'Label_42' })).toBe('maxResults=25&labelIds=Label_42');
    });
});

describe('parseFromHeader', () => {
    test('display name and address', () => {
        expect(parseFromHeader('"Jane Doe" <jane@example.com>')).toEqual({
            from: 'Jane Doe',
            fromEmail: 'jane@example.com',
        });
        expect(parseFromHeader('=?UTF-8?B?Sm9yZ2Vu?= <j@example.com> (via Groups)')).toEqual({
            from: 'Jorgen',
            fromEmail: 'j@example.com',
        });
    });
});

describe('GmailAdapter', () => {
    test('fetchItems passes the page token and returns nextPageToken as the cursor', async () => {
        const calls: string[] = [];
        globalThis.fetch = (async (input: string | URL | Request) => {
            const url = String(input);
            calls.push(url);
            if (url.includes('/messages?')) {
                return Response.json({ messages: [{ id: 'm1', threadId: 't1' }], nextPageToken: 'next-123' });
            }
            return Response.json({
                id: 'm1',
                threadId: 't1',
                labelIds: ['INBOX', 'UNREAD'],
                snippet: 'Hello',
                internalDate: '1760000000000',
                payload: { headers: [{ name: 'Subject', value: 'Hi' }, { name: 'From', value: 'A <a@x.com>' }] },
            });
        }) as typeof fetch;

        const result = await new GmailAdapter().fetchItems('token', {
            settings: { ...DEFAULT_SETTINGS, gmailPreset: 'starred' },
            cursor: 'page-2',
        });

        expect(calls[0]).toContain('labelIds=STARRED');
        expect(calls[0]).toContain('pageToken=page-2');
        expect(calls[1]).toContain('format=metadata');
        expect(result.nextCursor).toBe('next-123');
        expect(result.items[0]).toMatchObject({ externalId: 'm1', unread: true, state: 'open', status: 'unread' });
    });

    test('fetchDetail decodes the full message', async () => {
        globalThis.fetch = (async () => Response.json(multipart)) as unknown as typeof fetch;
        const detail = await new GmailAdapter().fetchDetail('token', '18f0a1b2c3d4e5f6');
        expect(detail).toEqual({
            externalId: '18f0a1b2c3d4e5f6',
            body: 'Hi Piyush,\nThe report is ready. Café ☕',
            truncated: false,
            comments: [],
        });
    });

    test('fetchOptions keeps user labels and the four useful system labels', async () => {
        globalThis.fetch = (async () =>
            Response.json({
                labels: [
                    { id: 'INBOX', name: 'INBOX', type: 'system' },
                    { id: 'SPAM', name: 'SPAM', type: 'system' },
                    { id: 'STARRED', name: 'STARRED', type: 'system' },
                    { id: 'Label_1', name: 'Clients', type: 'user' },
                ],
            })) as unknown as typeof fetch;
        const options = await new GmailAdapter().fetchOptions('token');
        expect(options).toEqual({
            labels: [
                { id: 'Label_1', name: 'Clients' },
                { id: 'INBOX', name: 'INBOX' },
                { id: 'STARRED', name: 'STARRED' },
            ],
        });
    });
});
