"use client";

import React from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { AnimationWrapper } from "../ui/animation-wrapper";
import { Button } from "../ui/button";
import { ZenithLogo } from "@/components/brand/ZenithLogo";

const linkGroups = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Daily rhythm", href: "#rhythm" },
      { label: "Integrations", href: "#integrations" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", href: "/login" },
      { label: "Sign up", href: "/signup" },
    ],
  },
];

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

const columnVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.08 * i,
      duration: 0.45,
      ease: easeOut,
    },
  }),
};

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <motion.li
      whileHover={{ x: 3 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      <Link
        href={href}
        className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span>{label}</span>
        <ArrowUpRight className="h-3.5 w-3.5 translate-x-[-2px] translate-y-[2px] opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
      </Link>
    </motion.li>
  );
}

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-border bg-paper">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-brand/10 blur-3xl"
        animate={{ opacity: [0.35, 0.55, 0.35], scale: [1, 1.06, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-8 h-48 w-48 rounded-full bg-brand/8 blur-3xl"
        animate={{ opacity: [0.25, 0.45, 0.25], scale: [1, 1.08, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />

      <AnimationWrapper className="relative mx-auto max-w-6xl px-6 pt-16 md:pt-20">
        <div className="overflow-hidden rounded-t-3xl border border-b-0 border-border bg-background shadow-inset-soft">
          <div className="grid gap-12 px-6 py-10 md:grid-cols-[1.2fr_1fr] md:gap-10 md:px-10 md:py-12 lg:grid-cols-[1.35fr_1fr]">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, ease: easeOut }}
              className="flex flex-col justify-between gap-8"
            >
              <div>
                <ZenithLogo href="/" />
                <p className="mt-4 max-w-sm text-base leading-relaxed text-muted-foreground">
                  One calm board for your whole day — plan it, focus through it,
                  and end it in control.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="brand" size="sm" asChild>
                  <Link href="/signup">
                    Start for free
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
              </div>
            </motion.div>

            <div className="grid gap-10 sm:grid-cols-2">
              {linkGroups.map((group, groupIndex) => (
                <motion.div
                  key={group.title}
                  custom={groupIndex + 1}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                  variants={columnVariants}
                >
                  <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {group.title}
                  </span>
                  <ul className="mt-4 flex flex-col gap-2.5">
                    {group.links.map((link) => (
                      <FooterLink key={link.href} href={link.href} label={link.label} />
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.45 }}
            className="border-t border-border"
          >
            <div className="flex flex-col items-center justify-between gap-3 px-6 py-6 text-center sm:flex-row sm:text-left md:px-10">
              <p className="text-xs text-muted-foreground">
                &copy; {year} Zenith. All rights reserved.
              </p>
              <p className="text-xs text-muted-foreground">
                Free plan available · 7-day Pro trial
              </p>
            </div>
          </motion.div>
        </div>
      </AnimationWrapper>
    </footer>
  );
};

export default Footer;
