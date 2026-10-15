import type {
    FetchContext,
    FetchResult,
    IntegrationAdapter,
    IntegrationItemDetail,
    IntegrationProfile,
    UniversalTask,
} from "./types.ts";
import {
    InvalidCursorError,
    decodeCursor,
    encodeCursor,
    throwForResponse,
    toIsoDate,
    truncateBody,
} from "./types.ts";

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_SEARCH_URL = `${NOTION_API_BASE}/search`;
const NOTION_USERS_ME_URL = `${NOTION_API_BASE}/users/me`;
const NOTION_VERSION = "2022-06-28";
const PAGES_PAGE_SIZE = 20;
const DATABASE_PAGE_SIZE = 50;

interface NotionRichText {
    plain_text: string;
}

interface NotionTitleProperty {
    type: "title";
    title: NotionRichText[];
}

interface NotionOtherProperty {
    type: string;
    status?: { name: string } | null;
    select?: { name: string } | null;
    date?: { start: string; end?: string | null } | null;
}

type NotionProperty = NotionTitleProperty | NotionOtherProperty;

interface NotionIcon {
    type: string;
    emoji?: string;
}

export interface NotionPageResult {
    object: string;
    id: string;
    url: string;
    archived: boolean;
    created_time: string;
    last_edited_time: string;
    properties: Record<string, NotionProperty>;
    icon?: NotionIcon | null;
}

interface NotionSearchResponse {
    results: NotionPageResult[];
    next_cursor?: string | null;
    has_more?: boolean;
}

interface NotionDatabase {
    object: string;
    id: string;
    title?: NotionRichText[];
}

export interface NotionBlock {
    type: string;
    [key: string]: unknown;
}

interface NotionBlockContent {
    rich_text?: NotionRichText[];
    checked?: boolean;
}

// Pages mode cursor: Notion's start_cursor. Databases mode cursor: the next start_cursor per
// selected database (a database missing from the map is exhausted).
type NotionCursor = { p: string } | { d: Record<string, string> };

interface NotionUserResponse {
    name?: string;
    avatar_url?: string | null;
    bot?: {
        owner?: {
            user?: {
                name?: string;
            };
        };
    };
}

function buildHeaders(accessToken: string): Record<string, string> {
    return {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    };
}

function isTitleProperty(
    property: NotionProperty
): property is NotionTitleProperty {
    return property.type === "title";
}

// Notion stores the page title under whichever property has type "title",
// as an array of rich text objects rather than a plain string.
export function extractTitle(page: NotionPageResult): string {
    const titleProperty = Object.values(page.properties).find(isTitleProperty);

    if (!titleProperty || titleProperty.title.length === 0) {
        return "Untitled";
    }

    const joined = titleProperty.title
        .map((richText) => richText.plain_text)
        .join("");

    return joined.length > 0 ? joined : "Untitled";
}

function joinRichText(richText: NotionRichText[] | undefined): string {
    return (richText ?? []).map((text) => text.plain_text).join("");
}

/**
 * One block as one line of plain text. Unsupported blocks (images, dividers, embeds) give "".
 * `index` is the 1 based position within a run of numbered list items.
 */
export function blockToText(block: NotionBlock, index = 1): string {
    const content = block[block.type] as NotionBlockContent | undefined;
    const text = joinRichText(content?.rich_text);
    switch (block.type) {
        case "paragraph":
            return text;
        case "heading_1":
            return text ? `# ${text}` : "";
        case "heading_2":
            return text ? `## ${text}` : "";
        case "heading_3":
            return text ? `### ${text}` : "";
        case "bulleted_list_item":
            return `- ${text}`;
        case "numbered_list_item":
            return `${index}. ${text}`;
        case "to_do":
            return `${content?.checked ? "[x]" : "[ ]"} ${text}`;
        case "quote":
            return `> ${text}`;
        case "code":
            return text;
        default:
            return "";
    }
}

/**
 * Top level blocks as text lines. Deliberately does not recurse into children: every nested
 * level is another request, and the top level is enough for a preview.
 */
export function blocksToText(blocks: NotionBlock[]): string {
    const lines: string[] = [];
    let number = 0;
    for (const block of blocks) {
        number = block.type === "numbered_list_item" ? number + 1 : 0;
        lines.push(blockToText(block, number || 1));
    }
    // Keep single blank lines from empty paragraphs, but collapse runs of them.
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// The status property: a "status" type property (any name), else a "select" property whose name
// looks like Status.
function findStatusName(properties: Record<string, NotionProperty>): string | undefined {
    const entries = Object.entries(properties) as [string, NotionOtherProperty][];
    const statusProp = entries.find(([, prop]) => prop.type === "status")?.[1];
    if (statusProp) return statusProp.status?.name ?? undefined;
    const selectProp = entries.find(
        ([name, prop]) => prop.type === "select" && /status/i.test(name)
    )?.[1];
    return selectProp?.select?.name ?? undefined;
}

function findDueDate(properties: Record<string, NotionProperty>): string | undefined {
    const dateProp = Object.values(properties).find(
        (prop) => prop.type === "date"
    ) as NotionOtherProperty | undefined;
    const start = dateProp?.date?.start;
    return start ? start.slice(0, 10) : undefined;
}

const DONE_PATTERN = /done|complete/i;

/** Maps one database row, or null when the row is done (status matches done/complete). */
export function mapDatabaseRow(row: NotionPageResult, databaseTitle: string): UniversalTask | null {
    if (row.archived) return null;
    const statusName = findStatusName(row.properties);
    if (statusName && DONE_PATTERN.test(statusName)) return null;
    const icon = row.icon;
    return {
        externalId: row.id,
        provider: "notion",
        type: "page",
        title: extractTitle(row),
        link: row.url,
        status: statusName ?? "active",
        state: "open",
        dueDate: findDueDate(row.properties),
        createdAt: toIsoDate(row.created_time),
        updatedAt: toIsoDate(row.last_edited_time),
        lastEdited: toIsoDate(row.last_edited_time),
        icon: icon?.type === "emoji" ? icon.emoji : undefined,
        workspace: databaseTitle,
    };
}

function mapSearchPage(page: NotionPageResult): UniversalTask {
    const icon = page.icon;
    return {
        externalId: page.id,
        provider: "notion",
        type: "page",
        title: extractTitle(page),
        link: page.url,
        status: page.archived ? "archived" : "active",
        state: page.archived ? "archived" : "open",
        createdAt: toIsoDate(page.created_time),
        updatedAt: toIsoDate(page.last_edited_time),
        lastEdited: toIsoDate(page.last_edited_time),
        icon: icon?.type === "emoji" ? icon.emoji : undefined,
    };
}

function decodeNotionCursor(cursor: string): NotionCursor {
    const decoded = decodeCursor<Record<string, unknown>>(cursor);
    if (decoded && typeof decoded.p === "string") return { p: decoded.p };
    if (decoded && decoded.d && typeof decoded.d === "object") {
        const map: Record<string, string> = {};
        for (const [id, value] of Object.entries(decoded.d as Record<string, unknown>)) {
            if (typeof value === "string") map[id] = value;
        }
        return { d: map };
    }
    throw new InvalidCursorError();
}

export class NotionAdapter implements IntegrationAdapter {
    async fetchItems(accessToken: string, context: FetchContext): Promise<FetchResult> {
        const cursor = context.cursor ? decodeNotionCursor(context.cursor) : undefined;
        if (context.settings.notionMode === "databases") {
            if (cursor && !("d" in cursor)) throw new InvalidCursorError();
            return this.fetchDatabaseItems(
                accessToken,
                context.settings.notionDatabaseIds,
                cursor && "d" in cursor ? cursor.d : undefined
            );
        }
        if (cursor && !("p" in cursor)) throw new InvalidCursorError();
        return this.fetchRecentPages(accessToken, cursor && "p" in cursor ? cursor.p : undefined);
    }

    private async fetchRecentPages(accessToken: string, startCursor?: string): Promise<FetchResult> {
        const res = await fetch(NOTION_SEARCH_URL, {
            method: "POST",
            headers: buildHeaders(accessToken),
            body: JSON.stringify({
                filter: { value: "page", property: "object" },
                page_size: PAGES_PAGE_SIZE,
                sort: { direction: "descending", timestamp: "last_edited_time" },
                ...(startCursor ? { start_cursor: startCursor } : {}),
            }),
        });

        if (!res.ok) {
            await throwForResponse("notion", res, "fetching pages");
        }

        const data = (await res.json()) as NotionSearchResponse;

        return {
            items: data.results
                .filter((result) => result.object === "page")
                .map(mapSearchPage),
            nextCursor:
                data.has_more && data.next_cursor ? encodeCursor({ p: data.next_cursor }) : undefined,
        };
    }

    // For a cursor (a later page) only the databases named in it are queried, each from its own
    // start_cursor; on the first page every selected database is queried.
    private async fetchDatabaseItems(
        accessToken: string,
        databaseIds: string[],
        cursors?: Record<string, string>
    ): Promise<FetchResult> {
        const targets = cursors
            ? databaseIds.filter((id) => cursors[id] !== undefined)
            : databaseIds;

        const results = await Promise.all(
            targets.map(async (databaseId) => {
                const path = `${NOTION_API_BASE}/databases/${encodeURIComponent(databaseId)}`;
                const [metaRes, queryRes] = await Promise.all([
                    fetch(path, { headers: buildHeaders(accessToken) }),
                    fetch(`${path}/query`, {
                        method: "POST",
                        headers: buildHeaders(accessToken),
                        body: JSON.stringify({
                            page_size: DATABASE_PAGE_SIZE,
                            ...(cursors?.[databaseId] ? { start_cursor: cursors[databaseId] } : {}),
                        }),
                    }),
                ]);
                if (!metaRes.ok) await throwForResponse("notion", metaRes, "fetching database");
                if (!queryRes.ok) await throwForResponse("notion", queryRes, "querying database");

                const meta = (await metaRes.json()) as NotionDatabase;
                const data = (await queryRes.json()) as NotionSearchResponse;
                const title = joinRichText(meta.title) || "Untitled database";
                const items = data.results
                    .map((row) => mapDatabaseRow(row, title))
                    .filter((item): item is UniversalTask => item !== null);
                return {
                    databaseId,
                    items,
                    next: data.has_more && data.next_cursor ? data.next_cursor : undefined,
                };
            })
        );

        const next: Record<string, string> = {};
        for (const result of results) {
            if (result.next) next[result.databaseId] = result.next;
        }
        return {
            items: results.flatMap((result) => result.items),
            nextCursor: Object.keys(next).length > 0 ? encodeCursor({ d: next }) : undefined,
        };
    }

    async fetchDetail(accessToken: string, externalId: string): Promise<IntegrationItemDetail> {
        const res = await fetch(
            `${NOTION_API_BASE}/blocks/${encodeURIComponent(externalId)}/children?page_size=100`,
            { headers: buildHeaders(accessToken) }
        );
        if (!res.ok) {
            await throwForResponse("notion", res, "fetching page content");
        }
        const data = (await res.json()) as { results: NotionBlock[] };
        return {
            externalId,
            ...truncateBody(blocksToText(data.results ?? [])),
            comments: [],
        };
    }

    async fetchOptions(accessToken: string): Promise<Record<string, unknown>> {
        const res = await fetch(NOTION_SEARCH_URL, {
            method: "POST",
            headers: buildHeaders(accessToken),
            body: JSON.stringify({
                filter: { value: "database", property: "object" },
                page_size: 100,
            }),
        });
        if (!res.ok) {
            await throwForResponse("notion", res, "fetching databases");
        }
        const data = (await res.json()) as { results: NotionDatabase[] };
        const databases = (data.results ?? [])
            .filter((result) => result.object === "database")
            .map((database) => ({
                id: database.id,
                title: joinRichText(database.title) || "Untitled database",
            }));
        return { databases };
    }

    async fetchProfile(accessToken: string): Promise<IntegrationProfile> {
        const res = await fetch(NOTION_USERS_ME_URL, {
            headers: buildHeaders(accessToken),
        });

        if (!res.ok) {
            await throwForResponse("notion", res, "fetching profile");
        }

        const data = (await res.json()) as NotionUserResponse;

        return {
            username: data.bot?.owner?.user?.name ?? data.name ?? "Notion",
            avatar: data.avatar_url ?? "",
        };
    }
}
