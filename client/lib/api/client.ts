/**
 * Small typed fetch wrapper around the Zenith API.
 *
 * The backend (server/src/app.ts) mounts every route under /api/v1 and every
 * response body follows the ApiResponse / ApiError envelope defined in
 * server/src/utils/ApiResponse.ts and server/src/utils/ApiError.ts:
 *
 *   success response: { success: true,  statusCode, data, message }
 *   error response:   { success: false, statusCode, message, errors }
 *
 * Auth is a Bearer JWT in the Authorization header (see
 * server/src/middleware/auth.middleware.ts), not a cookie, so this client
 * reads the token from localStorage and attaches it to every request unless
 * explicitly opted out.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_PREFIX = "/api/v1";

const TOKEN_STORAGE_KEY = "zenith_auth_token";

/** SSR-safe token storage helpers (localStorage only exists in the browser). */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

interface ApiEnvelope<T> {
  success: boolean;
  statusCode: number;
  data: T;
  message: string;
  errors?: unknown[];
}

/** Typed error thrown for any non 2xx response or network failure. */
export class ApiRequestError extends Error {
  statusCode: number;
  errors: unknown[];

  constructor(message: string, statusCode: number, errors: unknown[] = []) {
    super(message);
    this.name = "ApiRequestError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

interface RequestOptions {
  /** Attach the Authorization header. Defaults to true. */
  auth?: boolean;
  headers?: Record<string, string>;
}

async function request<T>(
  path: string,
  init: Omit<RequestInit, "headers"> & RequestOptions = {}
): Promise<T> {
  const { auth = true, headers: extraHeaders, ...rest } = init;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  if (auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
      ...rest,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiRequestError("Network error, please check your connection", 0);
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? ((await res.json().catch(() => null)) as ApiEnvelope<T> | null) : null;

  if (!res.ok) {
    const message = body?.message || res.statusText || "Request failed";
    const errors = body?.errors ?? [];
    throw new ApiRequestError(message, body?.statusCode ?? res.status, errors);
  }

  // Successful requests always come back wrapped in the ApiResponse envelope.
  return (body ? body.data : (null as T)) as T;
}

function toBody(data: unknown): string | undefined {
  return data === undefined ? undefined : JSON.stringify(data);
}

export const apiClient = {
  get: <T>(path: string, options: RequestOptions = {}) =>
    request<T>(path, { method: "GET", ...options }),

  post: <T>(path: string, data?: unknown, options: RequestOptions = {}) =>
    request<T>(path, { method: "POST", body: toBody(data), ...options }),

  put: <T>(path: string, data?: unknown, options: RequestOptions = {}) =>
    request<T>(path, { method: "PUT", body: toBody(data), ...options }),

  del: <T>(path: string, options: RequestOptions = {}) =>
    request<T>(path, { method: "DELETE", ...options }),
};
