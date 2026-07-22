/**
 * Auth service functions, typed against server/src/modules/auth.
 *
 * Response shapes come straight from auth.controller.ts:
 *   POST /auth/register  -> ApiResponse<{ token, trialEndsAt }>
 *   POST /auth/login     -> ApiResponse<{ token, plan, isTrialActive, trialEndsAt }>
 *   POST /auth/forgot-password -> ApiResponse<null>
 *   POST /auth/reset-password  -> ApiResponse<null>
 *
 * Note: the backend does not expose a dedicated "current user from token"
 * route. The nearest equivalent is GET /auth/me/:userId (auth.routes.ts),
 * which is authenticated but needs the user's Mongo _id in the URL. Since
 * the JWT payload only carries { id } (see auth.model.ts generateAuthToken),
 * getCurrentUser() below decodes that id client side and fetches the full
 * record. There is no need to guess anything: this mirrors exactly what
 * authMiddleware does server side when it looks the user up by decoded id.
 */

import { apiClient } from "./client";

export interface RegisterPayload {
  name?: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface RegisterResponseData {
  token: string;
  trialEndsAt: string | null;
}

export interface LoginResponseData {
  token: string;
  plan: "free" | "pro";
  isTrialActive: boolean;
  trialEndsAt: string | null;
}

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isVerified?: boolean;
  plan?: "free" | "pro";
  trialEndsAt?: string | null;
  lastLogin?: string;
}

export function register(payload: RegisterPayload): Promise<RegisterResponseData> {
  return apiClient.post<RegisterResponseData>("/auth/register", payload, { auth: false });
}

export function login(payload: LoginPayload): Promise<LoginResponseData> {
  return apiClient.post<LoginResponseData>("/auth/login", payload, { auth: false });
}

export function forgotPassword(email: string): Promise<null> {
  return apiClient.post<null>("/auth/forgot-password", { email }, { auth: false });
}

export function resetPassword(payload: ResetPasswordPayload): Promise<null> {
  return apiClient.post<null>("/auth/reset-password", payload, { auth: false });
}

/**
 * Ends the server side session and clears its cookie.
 *
 * Sent with `auth: false` on purpose: the whole point of calling this is to
 * recover from a state where the JWT is already gone but the session cookie
 * (sent by client.ts via `credentials: "include"`) is still alive. The backend
 * route is unauthenticated for the same reason.
 */
export function logout(): Promise<null> {
  return apiClient.post<null>("/auth/logout", undefined, { auth: false });
}

/**
 * Fetches the full user record for the id embedded in the current JWT.
 * Requires a valid Bearer token (attached automatically by apiClient).
 */
export function getCurrentUser(userId: string): Promise<AuthUser> {
  return apiClient.get<AuthUser>(`/auth/me/${userId}`);
}

/**
 * Decodes the `id` claim out of a JWT without verifying the signature.
 * Verification happens server side on every request; this is purely a
 * client side convenience so the UI knows which user record to load.
 */
export function decodeUserIdFromToken(token: string): string | null {
  try {
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) return null;

    const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof window === "undefined"
        ? Buffer.from(normalized, "base64").toString("utf-8")
        : window.atob(normalized);

    const payload = JSON.parse(json) as { id?: string };
    return payload.id ?? null;
  } catch {
    return null;
  }
}
