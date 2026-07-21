export type IntegrationProvider = "github" | "gmail" | "notion";

export type UniversalTaskType = "issue" | "pr" | "email" | "page";

export interface UniversalTask {
    externalId: string;
    provider: IntegrationProvider;
    type: UniversalTaskType;
    title: string;
    link: string;
    status: string;
    createdAt?: string;
    body?: string;
    number?: number;
    repository?: string;
    author?: string;
    authorAvatar?: string;
    labels?: { name: string; color: string }[];
    assignees?: { login: string; avatar_url: string }[];
    threadId?: string;
    from?: string;
    fromEmail?: string;
    snippet?: string;
    unread?: boolean;
    icon?: string;
    workspace?: string;
    lastEdited?: string;
}

export interface IntegrationProfile {
    username: string;
    avatar: string;
}

export interface IntegrationAdapter {
    fetchItems(accessToken: string): Promise<UniversalTask[]>;
    fetchProfile(accessToken: string): Promise<IntegrationProfile>;
}

// A 401 or 403 from a provider means the user revoked access or the token
// died, not a transient hiccup. Callers use instanceof to tell the two
// apart: this error should mark the stored integration as revoked so the
// UI can prompt a reconnect, every other failure must not revoke anything.
export class IntegrationAuthError extends Error {
    readonly status: number;
    constructor(provider: string, status: number, detail?: string) {
        const base = `${provider} authorization failed with status ${status}`;
        super(detail ? `${base}: ${detail}` : base);
        this.name = "IntegrationAuthError";
        this.status = status;
    }
}

// Builds a valid ISO date string from a provider supplied value, never an
// empty or malformed one. Tries the value as given, then falls back to now.
// A blank or unparseable createdAt reaches the client as new Date(""),
// which date-fns throws a RangeError on and blanks the whole route.
export function toIsoDate(value: unknown): string {
    if (typeof value === "string" && value.length > 0) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString();
        }
    }

    if (typeof value === "number" && !Number.isNaN(value)) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString();
        }
    }

    return new Date().toISOString();
}
