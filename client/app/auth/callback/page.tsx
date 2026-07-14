"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * OAuth redirect target.
 *
 * server/src/modules/auth/oauth.controller.ts redirects here after Google or
 * GitHub auth succeeds:
 *   `${FRONTEND_URL}/auth/callback?token=<jwt>`
 *
 * There is no user payload in the redirect, only the token, so we store it
 * and let useAuthStore.hydrateFromToken fetch the profile the same way the
 * email/password flow does.
 */
function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrateFromToken = useAuthStore((state) => state.hydrateFromToken);
  const token = searchParams.get("token");
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current || !token) return;
    hasRun.current = true;

    hydrateFromToken(token)
      .then(() => {
        router.replace("/dashboard");
      })
      .catch(() => {
        setError("Something went wrong while signing you in.");
      });
  }, [token, hydrateFromToken, router]);

  if (!token || error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-destructive">
          {error || "Sign in did not complete, no token was returned."}
        </p>
        <Link href="/login" className="text-sm font-medium underline">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Signing you in...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-muted-foreground">Signing you in...</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
