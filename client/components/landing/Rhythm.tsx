"use client";
import React from "react";
import { CheckCircle2, Circle, Sunrise, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { AnimationWrapper } from "../ui/animation-wrapper";

const steps = [
  {
    icon: Sunrise,
    period: "Morning",
    title: "Plan in the calm.",
    body: "Set your intentions and order the day before the noise starts.",
    chipClassName: "bg-work-soft text-tag-work",
    preview: (
      <div className="flex flex-col gap-2">
        {["Top 3 for today", "Block deep work", "Clear inbox"].map((item) => (
          <div
            key={item}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-tag-work)]" />
            {item}
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Sun,
    period: "Midday",
    title: "Focus at the peak.",
    body: "A built in timer and a single day board keep you on one thing.",
    chipClassName: "bg-brand-soft text-brand",
    preview: (
      <div className="flex items-center justify-center py-2">
        <div className="relative h-20 w-20">
          <svg
            viewBox="0 0 40 40"
            className="h-20 w-20 -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-border"
            />
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              className="text-brand"
              strokeDasharray={2 * Math.PI * 16}
              strokeDashoffset={2 * Math.PI * 16 * 0.38}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-medium tabular-nums text-foreground">
              24:12
            </span>
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
              Focus
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: Moon,
    period: "Evening",
    title: "Close with clarity.",
    body: "A short review finishes what matters and sets up tomorrow.",
    chipClassName: "bg-personal-soft text-tag-personal",
    preview: (
      <div className="flex flex-col gap-2">
        {[
          { label: "Ship onboarding flow", done: true },
          { label: "Review design feedback", done: true },
          { label: "Prep tomorrow's top 3", done: false },
        ].map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
              item.done
                ? "border-transparent bg-health-soft text-tag-health"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {item.done ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0" />
            )}
            {item.label}
          </div>
        ))}
      </div>
    ),
  },
];

export const Rhythm = () => {
  return (
    <section id="rhythm" className="relative w-full overflow-hidden bg-paper">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-soft opacity-50 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
        <AnimationWrapper className="mx-auto mb-14 max-w-2xl text-center md:mb-20">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            The rhythm
          </span>
          <h2 className="mt-3 font-instrument text-3xl font-semibold leading-tight text-foreground text-shadow-soft md:text-4xl">
            Start calm. Stay focused. End confident.
          </h2>
        </AnimationWrapper>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <AnimationWrapper key={step.period} delay={0.1 + i * 0.08}>
                <motion.div
                  className="group relative h-full"
                  initial="rest"
                  whileHover="hover"
                  variants={{
                    rest: { y: 0 },
                    hover: { y: -6 },
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 280,
                    damping: 22,
                  }}
                >
                  <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-inset-soft transition-shadow duration-300 group-hover:shadow-[0_20px_40px_-24px_rgb(0_0_0/0.18)] md:p-6">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 ${step.chipClassName}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {step.period}
                      </span>
                    </div>

                    <h3 className="mt-4 text-base font-medium text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>

                    <div className="inset-sunken mt-4 flex-1 rounded-xl bg-background p-3">
                      {step.preview}
                    </div>
                  </div>

                  <motion.div
                    aria-hidden="true"
                    variants={{
                      rest: {
                        opacity: 0,
                        scale: 0.65,
                        rotate: -14,
                        y: 8,
                      },
                      hover: {
                        opacity: 1,
                        scale: 1.08,
                        rotate: 0,
                        y: 0,
                      },
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 24,
                    }}
                    className={`absolute -right-2 -top-2 hidden h-9 w-9 items-center justify-center rounded-xl border border-border/60 shadow-inset-soft md:flex ${step.chipClassName}`}
                  >
                    <Icon className="h-4 w-4" />
                  </motion.div>
                </motion.div>
              </AnimationWrapper>
            );
          })}
        </div>
      </div>
    </section>
  );
};
