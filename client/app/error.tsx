"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Not silently swallowed: at least visible in the console during development.
        console.error(error);
    }, [error]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6">
            <div className="w-full max-w-sm text-center">
                <h1 className="text-xl font-semibold text-foreground mb-2">
                    Something went wrong
                </h1>
                <p className="text-sm text-muted-foreground mb-6">
                    An unexpected error occurred. Your data is safe, please try again.
                </p>
                <div className="flex items-center justify-center gap-3">
                    <Button onClick={() => reset()}>Try again</Button>
                    <Button variant="ghost" asChild>
                        <Link href="/dashboard">Back to dashboard</Link>
                    </Button>
                </div>
                {error.digest && (
                    <p className="mt-6 text-xs text-muted-foreground">
                        Error reference: {error.digest}
                    </p>
                )}
            </div>
        </div>
    );
}
