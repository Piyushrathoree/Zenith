import type {
    IntegrationAdapter,
    IntegrationProfile,
    UniversalTask,
} from "./types.ts";
import { IntegrationAuthError, toIsoDate } from "./types.ts";

// GitHub's REST API base URL and the headers every request needs.
const GITHUB_API_BASE = "https://api.github.com";

interface GitHubUser {
    login: string;
    avatar_url: string;
}

interface GitHubLabel {
    name: string;
    color: string;
}

interface GitHubPullRequestRef {
    url: string;
    merged_at: string | null;
}

interface GitHubIssueResponse {
    id: number;
    number: number;
    title: string;
    html_url: string;
    state: string;
    repository_url: string;
    created_at: string;
    body: string | null;
    user: GitHubUser | null;
    labels: GitHubLabel[];
    assignees: GitHubUser[] | null;
    pull_request?: GitHubPullRequestRef;
}

interface GitHubUserResponse {
    login: string;
    avatar_url: string | null;
}

function buildHeaders(accessToken: string): Record<string, string> {
    return {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "zenith-app",
    };
}

function parseRepositorySlug(repositoryUrl: string): string {
    const parts = repositoryUrl.split("/repos/");
    return parts[1] ?? "";
}

export class GitHubAdapter implements IntegrationAdapter {
    async fetchItems(accessToken: string): Promise<UniversalTask[]> {
        const res = await fetch(
            `${GITHUB_API_BASE}/issues?filter=assigned&state=all&per_page=30`,
            { headers: buildHeaders(accessToken) }
        );

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                throw new IntegrationAuthError(
                    "github",
                    res.status,
                    res.statusText
                );
            }
            throw new Error(
                `GitHub API error fetching issues: ${res.status} ${res.statusText}`
            );
        }

        const items = (await res.json()) as GitHubIssueResponse[];

        return items.map((item): UniversalTask => {
            const isPullRequest = Boolean(item.pull_request);
            const status =
                isPullRequest && item.pull_request?.merged_at
                    ? "merged"
                    : item.state;

            return {
                externalId: String(item.id),
                provider: "github",
                type: isPullRequest ? "pr" : "issue",
                title: item.title,
                link: item.html_url,
                status,
                createdAt: toIsoDate(item.created_at),
                body: item.body ?? "",
                number: item.number,
                repository: parseRepositorySlug(item.repository_url),
                author: item.user?.login,
                authorAvatar: item.user?.avatar_url,
                labels: (item.labels ?? []).map((label) => ({
                    name: label.name,
                    color: label.color,
                })),
                assignees: (item.assignees ?? []).map((assignee) => ({
                    login: assignee.login,
                    avatar_url: assignee.avatar_url,
                })),
            };
        });
    }

    async fetchProfile(accessToken: string): Promise<IntegrationProfile> {
        const res = await fetch(`${GITHUB_API_BASE}/user`, {
            headers: buildHeaders(accessToken),
        });

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                throw new IntegrationAuthError(
                    "github",
                    res.status,
                    res.statusText
                );
            }
            throw new Error(
                `GitHub API error fetching profile: ${res.status} ${res.statusText}`
            );
        }

        const data = (await res.json()) as GitHubUserResponse;

        return {
            username: data.login,
            avatar: data.avatar_url ?? "",
        };
    }
}
