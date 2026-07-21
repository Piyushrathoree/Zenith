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
}

export interface IntegrationFetchError {
  provider: IntegrationProvider;
  error: string;
}

export interface IntegrationItemsResponse {
  items: UniversalTask[];
  errors: IntegrationFetchError[];
}

export function listProviders(): Promise<ProviderInfo[]> {
  return apiClient.get<ProviderInfo[]>(`/integrations/providers`);
}

export function listConnectedIntegrations(): Promise<ConnectedIntegration[]> {
  return apiClient.get<ConnectedIntegration[]>(`/integrations`);
}

export function getIntegrationItems(refresh?: boolean): Promise<IntegrationItemsResponse> {
  const query = refresh ? `?refresh=true` : ``;
  return apiClient.get<IntegrationItemsResponse>(`/integrations/items${query}`);
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
