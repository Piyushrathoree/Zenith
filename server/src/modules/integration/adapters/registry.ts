import type { IntegrationAdapter } from "./types.ts";
import { GitHubAdapter } from "./github.adapter.ts";
import { GmailAdapter } from "./gmail.adapter.ts";
import { NotionAdapter } from "./notion.adapter.ts";

// New providers are registered here and nowhere else.
const ADAPTER_REGISTRY: Record<string, IntegrationAdapter> = {
    github: new GitHubAdapter(),
    gmail: new GmailAdapter(),
    notion: new NotionAdapter(),
};

export function getAdapter(provider: string): IntegrationAdapter | undefined {
    return ADAPTER_REGISTRY[provider];
}
