import { create } from "zustand";
import {
  login as loginRequest,
  register as registerRequest,
  logout as logoutRequest,
  getCurrentUser,
  decodeUserIdFromToken,
  updateUser,
  type AuthUser,
  type LoginPayload,
  type RegisterPayload,
  type UpdateUserPayload,
} from "@/lib/api/auth";
import { getToken, setToken, clearToken } from "@/lib/api/client";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => void;
  /** Used by the OAuth callback page, which already has a token in hand. */
  hydrateFromToken: (token: string) => Promise<void>;
  /** Saves profile or preference changes and keeps the stored user in sync. Throws on failure. */
  updateProfile: (payload: UpdateUserPayload) => Promise<void>;
}

async function fetchUserForToken(token: string): Promise<AuthUser | null> {
  const userId = decodeUserIdFromToken(token);
  if (!userId) return null;
  try {
    return await getCurrentUser(userId);
  } catch {
    // The token is still valid for API calls even if the profile fetch fails,
    // so we do not clear auth state here - just leave user unset.
    return null;
  }
}

/**
 * Saves the browser's timezone to the account, once per browser. New accounts start on "UTC",
 * and "today" on the server depends on the timezone, so this makes the first load match the
 * user's real day. The per browser flag means a timezone the user picks in Settings is never
 * overwritten on a later login.
 */
async function syncBrowserTimezone(user: AuthUser | null): Promise<AuthUser | null> {
  if (!user || typeof window === "undefined") return user;
  if (user.timezone && user.timezone !== "UTC") return user;

  const flagKey = `zenith_tz_detected:${user._id}`;
  if (window.localStorage.getItem(flagKey)) return user;

  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!browserTz || browserTz === "UTC") return user;

  try {
    const updated = await updateUser(user._id, { timezone: browserTz });
    window.localStorage.setItem(flagKey, "1");
    return updated;
  } catch {
    // Non fatal: the user can still set the timezone in Settings.
    return user;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (payload) => {
    set({ isLoading: true });
    try {
      const data = await loginRequest(payload);
      setToken(data.token);
      const user = await syncBrowserTimezone(await fetchUserForToken(data.token));
      set({ token: data.token, user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (payload) => {
    set({ isLoading: true });
    try {
      const data = await registerRequest(payload);
      setToken(data.token);
      const user = await syncBrowserTimezone(await fetchUserForToken(data.token));
      set({ token: data.token, user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    // Best effort: the local state must be cleared even if the network call
    // fails, otherwise a user who is offline or hitting a dead backend can
    // never sign out. The server call is what drops the express-session
    // cookie, which clearToken() alone cannot touch.
    try {
      await logoutRequest();
    } catch {
      // Swallowed on purpose, see above.
    }
    clearToken();
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  loadFromStorage: () => {
    const token = getToken();
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }

    set({ token, isAuthenticated: true, isLoading: true });
    void fetchUserForToken(token).then(syncBrowserTimezone).then((user) => {
      set({ user, isLoading: false });
    });
  },

  hydrateFromToken: async (token) => {
    setToken(token);
    set({ token, isAuthenticated: true, isLoading: true });
    const user = await syncBrowserTimezone(await fetchUserForToken(token));
    set({ user, isLoading: false });
  },

  updateProfile: async (payload) => {
    const current = get().user;
    if (!current) throw new Error("You need to be signed in to change your settings");
    const updated = await updateUser(current._id, payload);
    set({ user: updated });
  },
}));
