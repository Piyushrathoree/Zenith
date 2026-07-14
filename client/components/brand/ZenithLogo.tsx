import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ZenithLogoProps = {
    variant?: "full" | "mark";
    className?: string;
    href?: string;
    showWordmark?: boolean;
};

const LOGO_SRC = "/logo.svg";
const LOCKUP_HEIGHT = "h-8";

const wordmarkClass =
    "font-instrument text-[1.375rem] font-bold italic leading-none tracking-[-0.03em] text-foreground translate-y-[2px]";

export function ZenithLogo({
    variant = "full",
    className,
    href,
    showWordmark = true,
}: ZenithLogoProps) {
    const isMarkOnly = variant === "mark" || !showWordmark;

    const mark = (
        <span
            className={cn(
                "inline-flex shrink-0 items-center justify-center",
                isMarkOnly ? (className ?? LOCKUP_HEIGHT) : LOCKUP_HEIGHT,
            )}
        >
            <Image
                src={LOGO_SRC}
                alt={isMarkOnly ? "Zenith" : ""}
                aria-hidden={!isMarkOnly}
                width={32}
                height={32}
                className={cn(
                    "object-contain",
                    isMarkOnly ? "size-full" : "size-8",
                )}
                priority
            />
        </span>
    );

    const content = isMarkOnly ? (
        mark
    ) : (
        <span
            className={cn(
                "inline-flex items-center gap-1.5",
                LOCKUP_HEIGHT,
                className,
            )}
        >
            {mark}
            <span className={wordmarkClass}>Zenith</span>
        </span>
    );

    if (href) {
        return (
            <Link href={href} className={cn("inline-flex items-center", LOCKUP_HEIGHT)}>
                {content}
            </Link>
        );
    }

    return content;
}
