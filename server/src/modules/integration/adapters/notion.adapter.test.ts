import { afterEach, describe, expect, test } from 'bun:test';
import {
    NotionAdapter,
    blockToText,
    blocksToText,
    mapDatabaseRow,
    type NotionBlock,
    type NotionPageResult,
} from './notion.adapter.ts';
import { DEFAULT_SETTINGS } from '../integration.settings.ts';
import { decodeCursor, encodeCursor } from './types.ts';
import blocks from './fixtures/notion-blocks.json';
import database from './fixtures/notion-database.json';

const rows = database.query.results as unknown as NotionPageResult[];
const DB_ID = database.database.id;

const realFetch = globalThis.fetch;
afterEach(() => {
    globalThis.fetch = realFetch;
});

describe('blocksToText', () => {
    test('turns supported blocks into plain text lines', () => {
        expect(blocksToText(blocks.results as NotionBlock[])).toBe(
            [
                '# Launch plan',
                'Ship on Friday.',
                '- Write docs',
                '1. Build',
                '2. Test',
                '[x] Book room',
                '[ ] Send invite',
                '',
                '> Stay calm',
                'bun test',
                '## Notes',
            ].join('\n')
        );
    });

    test('unsupported blocks give an empty line', () => {
        expect(blockToText({ type: 'divider', divider: {} })).toBe('');
    });
});

describe('mapDatabaseRow', () => {
    test('maps title, status type property and the first date property', () => {
        expect(mapDatabaseRow(rows[0]!, 'Sprint Board')).toMatchObject({
            externalId: 'row-1',
            provider: 'notion',
            type: 'page',
            title: 'Write release notes',
            status: 'In progress',
            state: 'open',
            dueDate: '2026-10-20',
            workspace: 'Sprint Board',
            icon: '🚀',
        });
    });

    test('skips done rows, by status type or by a select named like Status', () => {
        expect(mapDatabaseRow(rows[1]!, 'Sprint Board')).toBeNull();
        expect(mapDatabaseRow(rows[3]!, 'Sprint Board')).toBeNull();
    });

    test('uses a select only when its name looks like Status, and an empty title is Untitled', () => {
        expect(mapDatabaseRow(rows[2]!, 'Sprint Board')).toMatchObject({
            title: 'Untitled',
            status: 'Not started',
            dueDate: '2026-11-02',
        });
    });
});

describe('NotionAdapter.fetchItems', () => {
    function stubDatabase(): { url: string; body?: string }[] {
        const calls: { url: string; body?: string }[] = [];
        globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
            const url = String(input);
            calls.push({ url, body: init?.body as string | undefined });
            if (url.endsWith('/query')) return Response.json(database.query);
            return Response.json(database.database);
        }) as typeof fetch;
        return calls;
    }

    test('databases mode queries each database and sets workspace to its title', async () => {
        const calls = stubDatabase();
        const result = await new NotionAdapter().fetchItems('token', {
            settings: { ...DEFAULT_SETTINGS, notionMode: 'databases', notionDatabaseIds: [DB_ID] },
        });

        expect(calls.map((call) => call.url).sort()).toEqual([
            `https://api.notion.com/v1/databases/${DB_ID}`,
            `https://api.notion.com/v1/databases/${DB_ID}/query`,
        ]);
        expect(result.items.map((item) => item.externalId)).toEqual(['row-1', 'row-3']);
        expect(result.items[0]!.workspace).toBe('Sprint Board');
        expect(decodeCursor<object>(result.nextCursor!)).toEqual({ d: { [DB_ID]: 'cursor-page-2' } });
    });

    test('a databases cursor passes start_cursor', async () => {
        const calls = stubDatabase();
        await new NotionAdapter().fetchItems('token', {
            settings: { ...DEFAULT_SETTINGS, notionMode: 'databases', notionDatabaseIds: [DB_ID] },
            cursor: encodeCursor({ d: { [DB_ID]: 'cursor-page-2' } }),
        });
        const query = calls.find((call) => call.url.endsWith('/query'))!;
        expect(JSON.parse(query.body!)).toEqual({ page_size: 50, start_cursor: 'cursor-page-2' });
    });

    test('pages mode uses search with start_cursor pagination', async () => {
        let sentBody: Record<string, unknown> = {};
        globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
            sentBody = JSON.parse(init?.body as string);
            return Response.json({ results: [rows[0]], has_more: true, next_cursor: 'abc' });
        }) as typeof fetch;

        const result = await new NotionAdapter().fetchItems('token', {
            settings: DEFAULT_SETTINGS,
            cursor: encodeCursor({ p: 'start-here' }),
        });

        expect(sentBody.start_cursor).toBe('start-here');
        expect(result.items[0]).toMatchObject({ externalId: 'row-1', state: 'open', status: 'active' });
        expect(decodeCursor<object>(result.nextCursor!)).toEqual({ p: 'abc' });
    });

    test('fetchDetail returns the blocks as text', async () => {
        globalThis.fetch = (async () => Response.json(blocks)) as unknown as typeof fetch;
        const detail = await new NotionAdapter().fetchDetail('token', 'page-1');
        expect(detail.body.startsWith('# Launch plan\nShip on Friday.')).toBe(true);
        expect(detail.comments).toEqual([]);
    });
});
