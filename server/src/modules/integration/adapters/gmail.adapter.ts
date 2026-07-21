import type {
    IntegrationAdapter,
    IntegrationProfile,
    UniversalTask,
} from "./types.ts";
import { IntegrationAuthError, toIsoDate } from "./types.ts";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";

interface GmailHeader {
    name: string;
    value: string;
}

interface GmailListResponse {
    messages?: { id: string; threadId: string }[];
}

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
function parseFromHeader(raw: string): { from: string; fromEmail: string } {
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

export class GmailAdapter implements IntegrationAdapter {
    async fetchItems(accessToken: string): Promise<UniversalTask[]> {
        const listRes = await fetch(
            `${GMAIL_API_BASE}/users/me/messages?maxResults=20&q=in:inbox`,
            { headers: buildHeaders(accessToken) }
        );

        if (!listRes.ok) {
            if (listRes.status === 401 || listRes.status === 403) {
                throw new IntegrationAuthError(
                    "gmail",
                    listRes.status,
                    listRes.statusText
                );
            }
            throw new Error(
                `Gmail API error fetching message list: ${listRes.status} ${listRes.statusText}`
            );
        }

        const { messages } = (await listRes.json()) as GmailListResponse;

        if (!messages || messages.length === 0) {
            return [];
        }

        const fullMessages = await Promise.all(
            messages.map(async ({ id }): Promise<GmailMessageResponse | null> => {
                const res = await fetch(
                    `${GMAIL_API_BASE}/users/me/messages/${id}` +
                        "?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date",
                    { headers: buildHeaders(accessToken) }
                );

                if (!res.ok) {
                    return null;
                }

                return (await res.json()) as GmailMessageResponse;
            })
        );

        return fullMessages
            .filter((message): message is GmailMessageResponse => message !== null)
            .map((message): UniversalTask => {
                const unread = Boolean(message.labelIds?.includes("UNREAD"));
                const rawFrom = getHeader(message.payload?.headers, "From", "");
                const parsedFrom = rawFrom ? parseFromHeader(rawFrom) : undefined;

                return {
                    externalId: message.id,
                    provider: "gmail",
                    type: "email",
                    title: getHeader(
                        message.payload?.headers,
                        "Subject",
                        "(no subject)"
                    ),
                    link: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
                    status: unread ? "unread" : "read",
                    createdAt: resolveCreatedAt(message),
                    threadId: message.threadId,
                    from: parsedFrom?.from,
                    fromEmail: parsedFrom?.fromEmail,
                    snippet: message.snippet ?? "",
                    unread,
                };
            });
    }

    async fetchProfile(accessToken: string): Promise<IntegrationProfile> {
        const res = await fetch(`${GMAIL_API_BASE}/users/me/profile`, {
            headers: buildHeaders(accessToken),
        });

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                throw new IntegrationAuthError(
                    "gmail",
                    res.status,
                    res.statusText
                );
            }
            throw new Error(
                `Gmail API error fetching profile: ${res.status} ${res.statusText}`
            );
        }

        const data = (await res.json()) as GmailProfileResponse;

        return {
            username: data.emailAddress ?? "",
            avatar: "",
        };
    }
}
