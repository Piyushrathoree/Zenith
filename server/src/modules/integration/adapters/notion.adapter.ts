import type {
    IntegrationAdapter,
    IntegrationProfile,
    UniversalTask,
} from "./types.ts";
import { IntegrationAuthError, toIsoDate } from "./types.ts";

const NOTION_SEARCH_URL = "https://api.notion.com/v1/search";
const NOTION_USERS_ME_URL = "https://api.notion.com/v1/users/me";
const NOTION_VERSION = "2022-06-28";

interface NotionRichText {
    plain_text: string;
}

interface NotionTitleProperty {
    type: "title";
    title: NotionRichText[];
}

interface NotionOtherProperty {
    type: string;
}

type NotionProperty = NotionTitleProperty | NotionOtherProperty;

interface NotionIcon {
    type: string;
    emoji?: string;
}

interface NotionPageResult {
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
}

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
function extractTitle(page: NotionPageResult): string {
    const titleProperty = Object.values(page.properties).find(isTitleProperty);

    if (!titleProperty || titleProperty.title.length === 0) {
        return "Untitled";
    }

    const joined = titleProperty.title
        .map((richText) => richText.plain_text)
        .join("");

    return joined.length > 0 ? joined : "Untitled";
}

export class NotionAdapter implements IntegrationAdapter {
    async fetchItems(accessToken: string): Promise<UniversalTask[]> {
        const res = await fetch(NOTION_SEARCH_URL, {
            method: "POST",
            headers: buildHeaders(accessToken),
            body: JSON.stringify({
                filter: { value: "page", property: "object" },
                page_size: 20,
                sort: { direction: "descending", timestamp: "last_edited_time" },
            }),
        });

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                throw new IntegrationAuthError(
                    "notion",
                    res.status,
                    res.statusText
                );
            }
            throw new Error(
                `Notion API error fetching pages: ${res.status} ${res.statusText}`
            );
        }

        const data = (await res.json()) as NotionSearchResponse;

        return data.results
            .filter((result) => result.object === "page")
            .map((page): UniversalTask => {
                const icon = page.icon;
                return {
                    externalId: page.id,
                    provider: "notion",
                    type: "page",
                    title: extractTitle(page),
                    link: page.url,
                    status: page.archived ? "archived" : "active",
                    createdAt: toIsoDate(page.created_time),
                    lastEdited: toIsoDate(page.last_edited_time),
                    icon: icon?.type === "emoji" ? icon.emoji : undefined,
                };
            });
    }

    async fetchProfile(accessToken: string): Promise<IntegrationProfile> {
        const res = await fetch(NOTION_USERS_ME_URL, {
            headers: buildHeaders(accessToken),
        });

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                throw new IntegrationAuthError(
                    "notion",
                    res.status,
                    res.statusText
                );
            }
            throw new Error(
                `Notion API error fetching profile: ${res.status} ${res.statusText}`
            );
        }

        const data = (await res.json()) as NotionUserResponse;

        return {
            username: data.bot?.owner?.user?.name ?? data.name ?? "Notion",
            avatar: data.avatar_url ?? "",
        };
    }
}
