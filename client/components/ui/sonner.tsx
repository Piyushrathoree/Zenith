"use client";

import { useEffect, useState } from "react";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/** Match the app's class-based theme (see hooks/useTheme.ts), not next-themes. */
function readDocumentTheme(): NonNullable<ToasterProps["theme"]> {
    if (typeof document === "undefined") return "system";
    if (document.documentElement.classList.contains("dark")) return "dark";
    if (document.documentElement.classList.contains("light")) return "light";
    return "system";
}

const Toaster = ({ ...props }: ToasterProps) => {
    const [theme, setTheme] = useState<ToasterProps["theme"]>("system");

    useEffect(() => {
        setTheme(readDocumentTheme());

        const observer = new MutationObserver(() => {
            setTheme(readDocumentTheme());
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });
        return () => observer.disconnect();
    }, []);

    return (
        <Sonner
            theme={theme as ToasterProps["theme"]}
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
                    description: "group-[.toast]:text-muted-foreground",
                    actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                    cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                },
            }}
            {...props}
        />
    );
};

export { Toaster, toast };
