"use client";
import React from "react";
import { CalendarCheck, Timer, CheckCircle } from "lucide-react";
import { AnimationWrapper } from "../ui/animation-wrapper";

const features = [
  {
    icon: CalendarCheck,
    title: "Plan your day in minutes.",
    body: "Set your intentions and order the day before the noise starts.",
    chipClassName: "bg-work-soft text-tag-work",
  },
  {
    icon: Timer,
    title: "Focus on one thing.",
    body: "A built in timer and a single day board keep you on task, not in tabs.",
    chipClassName: "bg-brand-soft text-brand",
  },
  {
    icon: CheckCircle,
    title: "End the day in control.",
    body: "A short evening review closes what matters and sets up tomorrow.",
    chipClassName: "bg-health-soft text-tag-health",
  },
];

const chips = ["Drag and drop", "Calendar view", "Weekly rituals"];

export const Features = () => {
  return (
    <section
      id="features"
      className="w-full max-w-6xl mx-auto px-6 py-24 md:py-32"
    >
      <AnimationWrapper className="max-w-2xl mb-14 md:mb-20">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          How it works
        </span>
        <h2 className="mt-3 font-instrument text-3xl md:text-4xl font-semibold text-foreground leading-tight text-shadow-soft">
          One calm rhythm for the whole day.
        </h2>
      </AnimationWrapper>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
        {features.map((feature, i) => {
          const Icon = feature.icon;
          return (
            <AnimationWrapper key={feature.title} delay={i * 0.1}>
              <div className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-inset-soft md:p-6">
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${feature.chipClassName}`}
                >
                  <Icon className="w-5 h-5" />
                </span>
                <div className="flex flex-col gap-2">
                  <h3 className="text-base font-medium text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.body}
                  </p>
                </div>
              </div>
            </AnimationWrapper>
          );
        })}
      </div>

      <AnimationWrapper
        delay={0.3}
        className="flex flex-wrap gap-3 mt-16 md:mt-20"
      >
        {chips.map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
          >
            {chip}
          </span>
        ))}
      </AnimationWrapper>
    </section>
  );
};
