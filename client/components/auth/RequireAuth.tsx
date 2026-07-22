"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { getToken } from "@/lib/api/client";
import { useStore } from "@/store/useStore";

/**
 * Client side route guard.
 *
 * The JWT lives in localStorage, not a cookie, so Next.js middleware (which
 * only runs on the edge/server and cannot read localStorage) is not able to
 * protect routes here. Instead this component checks the auth store on
 * mount and redirects to /login when there is no token.
 *
 * Usage: wrap the protected page content, e.g.
 *   <RequireAuth>
 *     <DashboardLayout />
 *   </RequireAuth>
 */

type AuthStatus = "checking" | "authorized" | "redirecting";

/**
 * Never render a bare null while deciding. An earlier version returned null
 * whenever the check had not completed, and the no-token branch returned
 * before marking the check done, so any redirect that did not land left the
 * user on a permanently blank white page with no way out. The manual link is
 * the safety net for exactly that case.
 */
function AuthFallback({ label, showLink }: { label: string; showLink?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      {showLink && (
        <Link href="/login" className="text-sm underline underline-offset-4">
          Go to sign in
        </Link>
      )}
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loadFromStorage = useAuthStore((state) => state.loadFromStorage);
  const logout = useAuthStore((state) => state.logout);
  const loadInitialData = useStore((state) => state.loadInitialData);
  const [status, setStatus] = useState<AuthStatus>("checking");

  useEffect(() => {
    if (!getToken()) {
      setStatus("redirecting");
      router.replace("/login");
      return;
    }
    setStatus("authorized");
    loadFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * The store keeps isAuthenticated in memory, so wiping localStorage left
   * this page rendering as a signed in dashboard while every API call went out
   * with no Authorization header and 401'd. Re-check whenever the token could
   * have changed underneath us.
   *
   * `storage` only fires in *other* tabs, so it catches a sign-out elsewhere
   * but never a DevTools "Clear site data" in this one. focus and
   * visibilitychange cover that case, since clearing storage by hand always
   * ends with the user clicking back into the page.
   */
  const syncFromStorage = useCallback(() => {
    if (getToken()) return;
    setStatus("redirecting");
    void logout();
    router.replace("/login");
  }, [logout, router]);

  useEffect(() => {
    window.addEventListener("storage", syncFromStorage);
    window.addEventListener("focus", syncFromStorage);
    document.addEventListener("visibilitychange", syncFromStorage);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener("focus", syncFromStorage);
      document.removeEventListener("visibilitychange", syncFromStorage);
    };
  }, [syncFromStorage]);

  // Once auth is confirmed, hydrate the planner (tasks/channels/today's plan)
  // from the backend. loadInitialData() itself no-ops on concurrent calls and
  // never throws - failures are surfaced as a toast and leave the store on
  // its empty/last-known state instead of crashing the dashboard.
  useEffect(() => {
    if (status === "authorized" && isAuthenticated) {
      void loadInitialData();
    }
  }, [status, isAuthenticated, loadInitialData]);

  if (status === "checking") {
    return <AuthFallback label="Loading your workspace" />;
  }

  if (status === "redirecting") {
    return <AuthFallback label="Taking you to sign in" showLink />;
  }

  return <>{children}</>;
}
