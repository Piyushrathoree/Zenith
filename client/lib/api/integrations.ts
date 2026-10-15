/**
 * Integrations service functions, typed against
 * server/src/modules/integration/adapters/types.ts and
 * server/src/modules/integration/integration.routes.ts.
 *
 * Every route below is mounted under /api/v1/integrations. All but the OAuth
 * redirect routes require the Bearer token (see client.ts). Responses are
 * unwrapped by apiClient already (it strips the ApiResponse envelope and
 * throws ApiRequestError on failure), so every function here resolves
 * directly with the `data` payload.
 *
 * The provider identifier is exactly "github" | "gmail" | "notion". Google is
 * only the OAuth vendor behind the "gmail" provider, so the string "google"
 * never appears as a provider key here.
 */

import { apiClient } from "./client";

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
  dueDate?: string;
  state?: "open" | "closed" | "done" | "archived";
  updatedAt?: string;
  githubRelation?: ("assigned" | "created" | "review_requested")[];
}

/** Why a connection is unhealthy, so the UI can show the right help. */
export type IntegrationErrorCode = "needs_reconnect" | "rate_limited" | "org_access" | "provider_down";

export interface IntegrationSettings {
  gmailPreset: "inbox" | "starred" | "unread" | "important" | "label";
  gmailLabelId?: string;
  notionMode: "pages" | "databases";
  notionDatabaseIds: string[];
  githubIncludeReviews: boolean;
}

export interface ProviderInfo {
  provider: IntegrationProvider;
  label: string;
  configured: boolean;
}

export interface ConnectedIntegration {
  provider: IntegrationProvider;
  status: "active" | "expired" | "revoked";
  profile: { username: string; avatar: string };
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string | null;
  lastError?: IntegrationErrorCode | null;
  lastErrorAt?: string | null;
  settings?: IntegrationSettings;
}

export interface IntegrationFetchError {
  provider: IntegrationProvider;
  error: string;
  code?: IntegrationErrorCode;
}

export interface IntegrationItemsResponse {
  items: UniversalTask[];
  errors: IntegrationFetchError[];
  nextCursors?: Partial<Record<IntegrationProvider, string>>;
}

export interface IntegrationItemDetail {
  externalId: string;
  body: string;
  truncated: boolean;
  comments: { author: string; body: string; createdAt: string }[];
}

export interface IntegrationOptions {
  labels?: { id: string; name: string }[];
  databases?: { id: string; title: string }[];
}

export function listProviders(): Promise<ProviderInfo[]> {
  return apiClient.get<ProviderInfo[]>(`/integrations/providers`);
}

export function listConnectedIntegrations(): Promise<ConnectedIntegration[]> {
  return apiClient.get<ConnectedIntegration[]>(`/integrations`);
}

/** All providers by default; pass `provider` (and optionally `cursor`) for one provider or the next page. */
export function getIntegrationItems(
  refresh?: boolean,
  options: { provider?: IntegrationProvider; cursor?: string } = {}
): Promise<IntegrationItemsResponse> {
  const params = new URLSearchParams();
  if (refresh) params.set("refresh", "true");
  if (options.provider) params.set("provider", options.provider);
  if (options.cursor) params.set("cursor", options.cursor);
  const query = params.toString();
  return apiClient.get<IntegrationItemsResponse>(`/integrations/items${query ? `?${query}` : ""}`);
}

/** Full body (and GitHub comments) for one item. GitHub needs the repository and number too. */
export function getItemDetail(
  provider: IntegrationProvider,
  externalId: string,
  github?: { repo: string; number: number }
): Promise<IntegrationItemDetail> {
  const query = github ? `?repo=${encodeURIComponent(github.repo)}&number=${github.number}` : "";
  return apiClient.get<IntegrationItemDetail>(
    `/integrations/items/${encodeURIComponent(provider)}/${encodeURIComponent(externalId)}${query}`
  );
}

export function updateIntegrationSettings(
  provider: IntegrationProvider,
  settings: Partial<IntegrationSettings>
): Promise<ConnectedIntegration> {
  return apiClient.put<ConnectedIntegration>(`/integrations/${encodeURIComponent(provider)}/settings`, settings);
}

export function getIntegrationOptions(provider: IntegrationProvider): Promise<IntegrationOptions> {
  return apiClient.get<IntegrationOptions>(`/integrations/${encodeURIComponent(provider)}/options`);
}

export function getConnectUrl(provider: IntegrationProvider): Promise<{ url: string }> {
  return apiClient.get<{ url: string }>(`/integrations/auth/${encodeURIComponent(provider)}/url`);
}

export function disconnectIntegration(provider: IntegrationProvider): Promise<{ provider: string }> {
  return apiClient.del<{ provider: string }>(`/integrations/${encodeURIComponent(provider)}`);
}

/**
 * Navigates the browser to the provider's OAuth consent screen.
 *
 * This is a two step dance rather than a plain link because a full page
 * browser navigation cannot send an Authorization header, so linking
 * straight to the server's connect route would 401. Instead we first fetch
 * the fully built consent URL with the bearer token attached (getConnectUrl,
 * a normal authenticated GET), then hand the browser that URL for the actual
 * navigation. Do not link directly to the connect route.
 */
export async function startProviderConnect(provider: IntegrationProvider): Promise<void> {
  const { url } = await getConnectUrl(provider);
  window.location.href = url;
}

/** Hide an item from the panel for good, or snooze it until `until` (ISO time). */
export function hideIntegrationItem(provider: IntegrationProvider, externalId: string, until?: string): Promise<unknown> {
  return apiClient.post(`/integrations/hidden`, { provider, externalId, ...(until ? { until } : {}) });
}
