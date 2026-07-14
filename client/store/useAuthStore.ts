import { create } from "zustand";
import {
  login as loginRequest,
  register as registerRequest,
  getCurrentUser,
  decodeUserIdFromToken,
  type AuthUser,
  type LoginPayload,
  type RegisterPayload,
} from "@/lib/api/auth";
import { getToken, setToken, clearToken } from "@/lib/api/client";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
  /** Used by the OAuth callback page, which already has a token in hand. */
  hydrateFromToken: (token: string) => Promise<void>;
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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (payload) => {
    set({ isLoading: true });
    try {
      const data = await loginRequest(payload);
      setToken(data.token);
      const user = await fetchUserForToken(data.token);
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
      const user = await fetchUserForToken(data.token);
      set({ token: data.token, user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
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
    void fetchUserForToken(token).then((user) => {
      set({ user, isLoading: false });
    });
  },

  hydrateFromToken: async (token) => {
    setToken(token);
    set({ token, isAuthenticated: true, isLoading: true });
    const user = await fetchUserForToken(token);
    set({ user, isLoading: false });
  },
}));
