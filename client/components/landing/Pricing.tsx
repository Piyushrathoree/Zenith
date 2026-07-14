"use client";
import React from "react";
import Link from "next/link";
import { Check, Compass, Sprout, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AnimationWrapper } from "@/components/ui/animation-wrapper";

const freeFeatures = [
  "Day board and daily planner",
  "Up to 4 active tasks",
  "Plan today and tomorrow",
  "Focus timer and rituals",
];

const proFeatures = [
  "Everything in Free",
  "Unlimited active tasks",
  "Plan as far ahead as you like",
  "GitHub, Gmail, and Notion integrations",
  "Priority for new features",
];

function FeatureList({
  items,
  chipClassName,
}: {
  items: string[];
  chipClassName: string;
}) {
  return (
    <ul className="flex flex-1 flex-col gap-3">
      {items.map((feature) => (
        <li
          key={feature}
          className="flex items-start gap-2.5 text-sm text-foreground"
        >
          <span
            className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${chipClassName}`}
          >
            <Check className="h-3 w-3" />
          </span>
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

export const Pricing = () => {
  return (
    <section id="pricing" className="bg-paper px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <AnimationWrapper className="mx-auto mb-14 max-w-2xl text-center md:mb-16">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Pricing
          </p>
          <h2 className="mt-3 font-instrument text-3xl font-semibold leading-tight tracking-tight text-foreground text-shadow-soft md:text-4xl">
            Simple pricing for a calmer day.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
            Start free and upgrade when you need more room. Every account
            includes a 7 day Pro trial, no card required.
          </p>
        </AnimationWrapper>

        <div className="mx-auto grid max-w-4xl items-stretch gap-6 md:grid-cols-2">
          <AnimationWrapper delay={0.05}>
            <motion.div
              className="flex h-full flex-col rounded-2xl border border-border bg-card p-8 shadow-inset-soft"
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-work-soft text-tag-work">
                  <Sprout className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-medium text-foreground">
                    Free
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    For getting your days in order.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-end gap-2">
                <span className="font-instrument text-4xl font-bold leading-none tracking-tight text-foreground">
                  $0
                </span>
                <span className="pb-1 text-sm text-muted-foreground">
                  forever
                </span>
              </div>

              <div className="mt-6 border-t border-border pt-6">
                <FeatureList
                  items={freeFeatures}
                  chipClassName="bg-work-soft text-tag-work"
                />
              </div>

              <div className="mt-auto pt-8">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  asChild
                >
                  <Link href="/signup">Start for free</Link>
                </Button>
              </div>
            </motion.div>
          </AnimationWrapper>

          <AnimationWrapper delay={0.12}>
            <motion.div
              className="relative flex h-full flex-col"
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
            >
              <span className="absolute left-8 top-0 z-10 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-[11px] font-medium text-background shadow-[0_1px_2px_rgb(0_0_0_/_0.15)]">
                <Star className="h-3 w-3" />
                Most popular
              </span>

              <div className="flex h-full flex-col rounded-2xl border border-foreground/15 bg-card p-8 shadow-soft">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Compass className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-medium text-foreground">
                      Pro
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      For people who live in their planner.
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-end gap-2">
                    <span className="font-instrument text-4xl font-bold leading-none tracking-tight text-foreground">
                      $0
                    </span>
                    <span className="pb-1 text-sm text-muted-foreground">
                      for 7 days
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Full Pro access during your trial, no card needed.
                  </p>
                </div>

                <div className="mt-6 border-t border-border pt-6">
                  <FeatureList
                    items={proFeatures}
                    chipClassName="bg-brand-soft text-brand"
                  />
                </div>

                <div className="mt-auto pt-8">
                  <Button
                    variant="brand"
                    size="lg"
                    className="w-full"
                    asChild
                  >
                    <Link href="/signup">Start free trial</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </AnimationWrapper>
        </div>

        <AnimationWrapper delay={0.2}>
          <p className="mx-auto mt-8 max-w-lg text-center text-xs text-muted-foreground md:text-sm">
            No credit card required. Your 7 day Pro trial starts when you sign
            up.
          </p>
        </AnimationWrapper>
      </div>
    </section>
  );
};
