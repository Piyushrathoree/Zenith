"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * The escape hatch on auth pages: always available, never conditional.
 *
 * This used to hide itself unless getToken() found a JWT or the store said
 * isAuthenticated. That made it disappear in the one situation it exists for.
 * The session cookie is httpOnly and client.ts sends it on every request via
 * `credentials: "include"`, so a user can have an empty localStorage and a
 * fully live server session at the same time - and JS cannot see that cookie
 * to know it should offer the button. Rendering unconditionally is the only
 * way to guarantee the way out is always there.
 */
export function ClearSessionButton() {
    const router = useRouter();
    const logout = useAuthStore((state) => state.logout);
    const [clearing, setClearing] = useState(false);

    const handleClear = async () => {
        setClearing(true);
        await logout();
        toast.success("Session cleared");
        router.replace("/login");
        setClearing(false);
    };

    return (
        <div className="mt-4 text-center">
            <p className="mb-2 text-xs text-muted-foreground">
                Signed in as someone else, or stuck?
            </p>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={clearing}
            >
                {clearing ? "Clearing..." : "Sign out / clear session"}
            </Button>
        </div>
    );
}
