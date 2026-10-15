import type {
    FetchContext,
    FetchResult,
    IntegrationAdapter,
    IntegrationItemDetail,
    IntegrationProfile,
    IntegrationSettings,
    UniversalTask,
} from "./types.ts";
import {
    mapWithConcurrency,
    throwForResponse,
    toIsoDate,
    truncateBody,
} from "./types.ts";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";

interface GmailHeader {
    name: string;
    value: string;
}

const PAGE_SIZE = 25;
const METADATA_CONCURRENCY = 8;

interface GmailListResponse {
    messages?: { id: string; threadId: string }[];
    nextPageToken?: string;
}

export interface GmailPart {
    mimeType?: string;
    filename?: string;
    body?: { data?: string; attachmentId?: string; size?: number };
    parts?: GmailPart[];
}

interface GmailFullMessage {
    id: string;
    payload?: GmailPart;
}

interface GmailLabel {
    id: string;
    name: string;
    type?: string;
}

// System labels worth offering in the label picker, alongside every user label.
const SYSTEM_LABELS_OFFERED = new Set(["INBOX", "STARRED", "IMPORTANT", "UNREAD"]);

interface GmailMessageResponse {
    id: string;
    threadId: string;
    labelIds?: string[];
    snippet?: string;
    internalDate?: string;
    payload?: {
        headers?: GmailHeader[];
    };
}

interface GmailProfileResponse {
    emailAddress?: string;
}

function buildHeaders(accessToken: string): Record<string, string> {
    return { Authorization: `Bearer ${accessToken}` };
}

function getHeader(
    headers: GmailHeader[] | undefined,
    name: string,
    fallback: string
): string {
    const lowerName = name.toLowerCase();
    const match = headers?.find((h) => h.name.toLowerCase() === lowerName);
    return match?.value ?? fallback;
}

// Always returns a valid ISO date string, never undefined and never
// something that would blow up new Date("") downstream. Prefers the Date
// header, then internalDate, and falls back to now if neither parses.
function resolveCreatedAt(message: GmailMessageResponse): string {
    const dateHeader = getHeader(message.payload?.headers, "Date", "");
    if (dateHeader) {
        const parsed = new Date(dateHeader);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString();
        }
    }

    return toIsoDate(
        message.internalDate ? Number(message.internalDate) : undefined
    );
}

// Decodes RFC 2047 encoded words such as "=?UTF-8?B?Sm9yZ2Vu?=" for the
// common Base64 and Quoted Printable forms with a UTF-8 or ASCII charset.
// Anything else, or anything malformed, is returned unchanged: this is not
// a full RFC 2047 decoder.
function decodeRfc2047(raw: string): string {
    return raw.replace(
        /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g,
        (match, charset: string, encoding: string, text: string) => {
            const normalized = charset.toLowerCase();
            if (!["utf-8", "ascii", "us-ascii"].includes(normalized)) {
                return match;
            }
            try {
                if (encoding.toUpperCase() === "B") {
                    return Buffer.from(text, "base64").toString("utf-8");
                }
                const bytes = text
                    .replace(/_/g, " ")
                    .replace(/=([0-9A-Fa-f]{2})/g, (_hex, code) =>
                        String.fromCharCode(parseInt(code, 16))
                    );
                return Buffer.from(bytes, "binary").toString("utf-8");
            } catch {
                return match;
            }
        }
    );
}

// Parses a raw "From" header shaped like `Display Name <someone@example.com>`.
// Not anchored to the end of the string, so a trailing comment like
// `John Doe <john@example.com> (via Google Groups)` still resolves to the
// right address instead of the whole header landing in fromEmail. The
// address is the last angle bracketed group anywhere in the header, and
// everything before the first angle bracket is the display name.
export function parseFromHeader(raw: string): { from: string; fromEmail: string } {
    const decoded = decodeRfc2047(raw);
    const firstOpen = decoded.indexOf("<");
    const lastClose = decoded.lastIndexOf(">");
    const lastOpen = lastClose === -1 ? -1 : decoded.lastIndexOf("<", lastClose);

    if (firstOpen === -1 || lastOpen === -1 || lastOpen > lastClose) {
        return { from: decoded, fromEmail: decoded };
    }

    const namePart = decoded
        .slice(0, firstOpen)
        .trim()
        .replace(/^"(.*)"$/, "$1");
    const emailPart = decoded.slice(lastOpen + 1, lastClose).trim();

    return {
        from: namePart.length > 0 ? namePart : emailPart,
        fromEmail: emailPart,
    };
}

/** The list query for the user's preset: labelIds and/or q, as Gmail expects them. */
export function buildListQuery(settings: IntegrationSettings): URLSearchParams {
    const params = new URLSearchParams({ maxResults: String(PAGE_SIZE) });
    switch (settings.gmailPreset) {
        case "starred":
            params.append("labelIds", "STARRED");
            break;
        case "unread":
            params.set("q", "is:unread in:inbox");
            break;
        case "important":
            params.append("labelIds", "IMPORTANT");
            break;
        case "label":
            // A missing label id cannot be saved (see integration.settings.ts); INBOX is a
            // safe fallback for an older document.
            params.append("labelIds", settings.gmailLabelId || "INBOX");
            break;
        case "inbox":
        default:
            params.append("labelIds", "INBOX");
            break;
    }
    return params;
}

function decodeBase64Url(data: string): string {
    return Buffer.from(data, "base64url").toString("utf-8");
}

const HTML_ENTITIES: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
};

/** Very small HTML to text: drops style/script/head, keeps line breaks, decodes common entities. */
export function htmlToText(html: string): string {
    return html
        .replace(/<(style|script|head)[^>]*>[\s\S]*?<\/\1>/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi, "\n")
        .replace(/<li[^>]*>/gi, "- ")
        .replace(/<[^>]+>/g, "")
        .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
            const lower = entity.toLowerCase();
            if (lower.startsWith("#x")) return String.fromCodePoint(parseInt(lower.slice(2), 16));
            if (lower.startsWith("#")) return String.fromCodePoint(parseInt(lower.slice(1), 10));
            return HTML_ENTITIES[lower] ?? match;
        })
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

// Depth first search for the first inline part of a given type. Attachments (a filename or an
// attachmentId with no inline data) are skipped.
function findPart(part: GmailPart | undefined, mimeType: string): string | null {
    if (!part) return null;
    if (part.mimeType === mimeType && part.body?.data && !part.filename) {
        return decodeBase64Url(part.body.data);
    }
    for (const child of part.parts ?? []) {
        const found = findPart(child, mimeType);
        if (found !== null) return found;
    }
    return null;
}

/**
 * The readable body of a Gmail payload tree. Searches the whole tree for text/plain first,
 * because multipart/alternative carries both and plain is the one worth showing, and only then
 * falls back to text/html stripped to text.
 */
export function extractPlainText(payload: GmailPart | undefined): string {
    const plain = findPart(payload, "text/plain");
    if (plain !== null) return plain.trim();
    const html = findPart(payload, "text/html");
    return html !== null ? htmlToText(html) : "";
}

export class GmailAdapter implements IntegrationAdapter {
    async fetchItems(accessToken: string, context: FetchContext): Promise<FetchResult> {
        const params = buildListQuery(context.settings);
        if (context.cursor) params.set("pageToken", context.cursor);

        const listRes = await fetch(
            `${GMAIL_API_BASE}/users/me/messages?${params.toString()}`,
            { headers: buildHeaders(accessToken) }
        );

        if (!listRes.ok) {
            await throwForResponse("gmail", listRes, "fetching message list");
        }

        const { messages, nextPageToken } = (await listRes.json()) as GmailListResponse;

        if (!messages || messages.length === 0) {
            return { items: [], nextCursor: nextPageToken || undefined };
        }

        const fullMessages = await mapWithConcurrency(
            messages,
            METADATA_CONCURRENCY,
            async ({ id }): Promise<GmailMessageResponse | null> => {
                const res = await fetch(
                    `${GMAIL_API_BASE}/users/me/messages/${encodeURIComponent(id)}` +
                        "?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date",
                    { headers: buildHeaders(accessToken) }
                );

                if (!res.ok) {
                    return null;
                }

                return (await res.json()) as GmailMessageResponse;
            }
        );

        const items = fullMessages
            .filter((message): message is GmailMessageResponse => message !== null)
            .map((message): UniversalTask => {
                const unread = Boolean(message.labelIds?.includes("UNREAD"));
                const rawFrom = getHeader(message.payload?.headers, "From", "");
                const parsedFrom = rawFrom ? parseFromHeader(rawFrom) : undefined;
                const createdAt = resolveCreatedAt(message);

                return {
                    externalId: message.id,
                    provider: "gmail",
                    type: "email",
                    title: getHeader(
                        message.payload?.headers,
                        "Subject",
                        "(no subject)"
                    ),
                    // #all works for any preset; #inbox only finds inbox messages.
                    link: `https://mail.google.com/mail/u/0/#all/${message.id}`,
                    status: unread ? "unread" : "read",
                    state: "open",
                    createdAt,
                    updatedAt: createdAt,
                    threadId: message.threadId,
                    from: parsedFrom?.from,
                    fromEmail: parsedFrom?.fromEmail,
                    snippet: message.snippet ?? "",
                    unread,
                };
            });

        return { items, nextCursor: nextPageToken || undefined };
    }

    async fetchDetail(accessToken: string, externalId: string): Promise<IntegrationItemDetail> {
        const res = await fetch(
            `${GMAIL_API_BASE}/users/me/messages/${encodeURIComponent(externalId)}?format=full`,
            { headers: buildHeaders(accessToken) }
        );
        if (!res.ok) {
            await throwForResponse("gmail", res, "fetching message");
        }
        const message = (await res.json()) as GmailFullMessage;
        return {
            externalId,
            ...truncateBody(extractPlainText(message.payload)),
            comments: [],
        };
    }

    async fetchOptions(accessToken: string): Promise<Record<string, unknown>> {
        const res = await fetch(`${GMAIL_API_BASE}/users/me/labels`, {
            headers: buildHeaders(accessToken),
        });
        if (!res.ok) {
            await throwForResponse("gmail", res, "fetching labels");
        }
        const data = (await res.json()) as { labels?: GmailLabel[] };
        const labels = (data.labels ?? [])
            .filter((label) => label.type === "user" || SYSTEM_LABELS_OFFERED.has(label.id))
            .map((label) => ({ id: label.id, name: label.name }))
            .sort((a, b) => a.name.localeCompare(b.name));
        return { labels };
    }

    async fetchProfile(accessToken: string): Promise<IntegrationProfile> {
        const res = await fetch(`${GMAIL_API_BASE}/users/me/profile`, {
            headers: buildHeaders(accessToken),
        });

        if (!res.ok) {
            await throwForResponse("gmail", res, "fetching profile");
        }

        const data = (await res.json()) as GmailProfileResponse;

        return {
            username: data.emailAddress ?? "",
            avatar: "",
        };
    }
}
