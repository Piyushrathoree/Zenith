"use client";

import { useEffect, useState } from "react";
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
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loadFromStorage = useAuthStore((state) => state.loadFromStorage);
  const loadInitialData = useStore((state) => state.loadInitialData);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    loadFromStorage();
    setChecked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (checked && !isAuthenticated && !getToken()) {
      router.replace("/login");
    }
  }, [checked, isAuthenticated, router]);

  // Once auth is confirmed, hydrate the planner (tasks/channels/today's plan)
  // from the backend. loadInitialData() itself no-ops on concurrent calls and
  // never throws - failures are surfaced as a toast and leave the store on
  // its empty/last-known state instead of crashing the dashboard.
  useEffect(() => {
    if (checked && isAuthenticated) {
      void loadInitialData();
    }
  }, [checked, isAuthenticated, loadInitialData]);

  if (!checked) {
    return null;
  }

  return <>{children}</>;
}
