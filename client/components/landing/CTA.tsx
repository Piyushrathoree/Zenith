"use client";
import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { AnimationWrapper } from "../ui/animation-wrapper";

const CTA = () => {
  return (
    <section className="border-t border-border bg-background py-24 md:py-32">
      <AnimationWrapper className="mx-auto max-w-4xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-paper px-6 py-16 text-center shadow-inset-soft md:px-12 md:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-inset-soft">
            <Sparkles className="h-3 w-3 text-brand" />
            Ready when you are
          </span>

          <h2 className="mt-5 font-instrument text-4xl font-semibold leading-[1.05] tracking-tight text-foreground text-shadow-soft md:text-5xl">
            Start your first calm day.
          </h2>

          <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground md:text-lg">
            Plan it, focus through it, and end it in control. Setup takes
            about five minutes.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button variant="brand" size="lg" asChild>
              <Link href="/signup">
                Start for free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="lg" asChild>
              <Link href="#features">See how it works</Link>
            </Button>
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            Free plan available · 7 day Pro trial · No card needed.
          </p>
        </div>
      </AnimationWrapper>
    </section>
  );
};

export default CTA;
