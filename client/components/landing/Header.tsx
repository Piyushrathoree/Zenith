"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Button } from "../ui/button";
import { Menu, X } from "lucide-react";
import { ZenithLogo } from "@/components/brand/ZenithLogo";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 h-14 md:h-16 border-b border-border bg-background/80 shadow-[0_1px_0_0_rgb(0_0_0_/_0.02)] backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
          <ZenithLogo href="/" />

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button variant="brand" size="sm" asChild>
              <Link href="/signup">Start for free</Link>
            </Button>
          </div>

          <button
            className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 top-14 z-40 border-t border-border bg-background md:hidden">
          <div className="flex flex-col items-center gap-6 px-6 pt-10">
            <nav className="flex flex-col items-center gap-5 text-base">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="flex w-full max-w-xs flex-col gap-3 pt-2">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  Log in
                </Link>
              </Button>
              <Button variant="brand" className="w-full" asChild>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                  Start for free
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
