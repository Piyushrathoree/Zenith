"use client";
import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  Kanban,
  Sunrise,
  Timer,
} from "lucide-react";
import { Button } from "../ui/button";
import { AnimationWrapper } from "@/components/ui/animation-wrapper";
import { cn } from "@/lib/utils";

type MockTask = {
  title: string;
  time: string;
  tag: "work" | "personal" | "health";
};

const todayTasks: MockTask[] = [
  { title: "Morning walk", time: "7:30 AM", tag: "health" },
  { title: "Ship onboarding flow", time: "9:00 AM", tag: "work" },
  { title: "Call with Priya", time: "1:00 PM", tag: "personal" },
  { title: "Review design feedback", time: "2:00 PM", tag: "work" },
];

const tagDotClass: Record<MockTask["tag"], string> = {
  work: "bg-[var(--color-tag-work)]",
  personal: "bg-[var(--color-tag-personal)]",
  health: "bg-[var(--color-tag-health)]",
};

const plannerBlocks = [
  { hour: "9 AM", label: "Team standup" },
  { hour: "10 AM" },
  { hour: "11 AM", label: "Deep work: roadmap" },
  { hour: "1 PM", label: "Call with Priya" },
];

type HeroView = "board" | "planner" | "focus" | "rituals";

type RailItem = {
  id: HeroView;
  label: string;
  icon: React.ElementType;
};

const railItems: RailItem[] = [
  { id: "board", label: "Board", icon: Kanban },
  { id: "planner", label: "Planner", icon: CalendarClock },
  { id: "focus", label: "Focus", icon: Timer },
  { id: "rituals", label: "Rituals", icon: Sunrise },
];

const panelMeta: Record<HeroView, { heading: string }> = {
  board: { heading: "Today" },
  planner: { heading: "Schedule" },
  focus: { heading: "Now" },
  rituals: { heading: "Morning" },
};

const initialRituals = [
  { label: "Set today's top 3", done: true },
  { label: "Review calendar", done: true },
  { label: "10 minute stretch", done: false },
];

const FOCUS_RADIUS = 16;
const FOCUS_CIRCUMFERENCE = 2 * Math.PI * FOCUS_RADIUS;
const FOCUS_PROGRESS = 0.62;

function HeroFocusBadge() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-inset-soft">
      <div className="relative h-9 w-9 shrink-0">
        <svg
          viewBox="0 0 40 40"
          className="h-9 w-9 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="20"
            cy="20"
            r={FOCUS_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-border"
          />
          <circle
            cx="20"
            cy="20"
            r={FOCUS_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className="text-brand"
            strokeDasharray={FOCUS_CIRCUMFERENCE}
            strokeDashoffset={FOCUS_CIRCUMFERENCE * (1 - FOCUS_PROGRESS)}
          />
        </svg>
      </div>
      <div className="pr-1">
        <p className="text-sm font-medium tabular-nums text-foreground">24:12</p>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Focus
        </p>
      </div>
    </div>
  );
}

function HeroBoardPanel() {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-background p-2 inset-sunken">
      {todayTasks.map((task) => (
        <div
          key={task.title}
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${tagDotClass[task.tag]}`}
            />
            <span className="truncate text-sm text-foreground">{task.title}</span>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {task.time}
          </span>
        </div>
      ))}
    </div>
  );
}

function HeroPlannerPanel() {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-background p-3 inset-sunken">
      {plannerBlocks.map((block) => (
        <div key={block.hour} className="flex items-center gap-3">
          <span className="w-12 shrink-0 text-xs text-muted-foreground">
            {block.hour}
          </span>
          {block.label ? (
            <div className="flex-1 rounded-lg border border-transparent bg-personal-soft px-3 py-2 text-xs text-tag-personal">
              {block.label}
            </div>
          ) : (
            <div className="h-px flex-1 border-t border-dashed border-border" />
          )}
        </div>
      ))}
    </div>
  );
}

function HeroFocusPanel() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-background px-4 py-6 inset-sunken">
      <div className="relative h-28 w-28">
        <svg
          viewBox="0 0 96 96"
          className="h-28 w-28 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="48"
            cy="48"
            r="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="text-border"
          />
          <circle
            cx="48"
            cy="48"
            r="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            className="text-brand"
            strokeDasharray={2 * Math.PI * 36}
            strokeDashoffset={2 * Math.PI * 36 * (1 - FOCUS_PROGRESS)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-medium tabular-nums text-foreground">
            24:12
          </span>
          <span className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            Focus
          </span>
        </div>
      </div>
      <p className="mt-4 text-sm text-foreground">Ship onboarding flow</p>
      <p className="mt-1 text-xs text-muted-foreground">25 min session</p>
    </div>
  );
}

function HeroRitualsPanel() {
  const [rituals, setRituals] = useState(initialRituals);

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-background p-2 inset-sunken">
      {rituals.map((item, index) => (
        <button
          key={item.label}
          type="button"
          onClick={() =>
            setRituals((prev) =>
              prev.map((ritual, i) =>
                i === index ? { ...ritual, done: !ritual.done } : ritual
              )
            )
          }
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
            item.done
              ? "border-transparent bg-health-soft text-tag-health"
              : "border-border bg-card text-muted-foreground hover:border-brand/25 hover:text-foreground"
          )}
        >
          {item.done ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <Circle className="h-4 w-4 shrink-0" />
          )}
          {item.label}
        </button>
      ))}
    </div>
  );
}

const panelComponents: Record<HeroView, React.FC> = {
  board: HeroBoardPanel,
  planner: HeroPlannerPanel,
  focus: HeroFocusPanel,
  rituals: HeroRitualsPanel,
};

const Hero = () => {
  const [activeView, setActiveView] = useState<HeroView>("board");
  const ActivePanel = panelComponents[activeView];

  return (
    <section className="relative overflow-hidden bg-background py-20 md:py-28 lg:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/4 top-0 -z-10 h-[36rem] w-[36rem] -translate-y-1/3 rounded-full bg-brand-soft opacity-50 blur-3xl"
      />

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-6 lg:grid-cols-12 lg:gap-8">
        {/* Copy column */}
        <div className="lg:col-span-5">
          <AnimationWrapper delay={0}>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Daily planning for focused people
            </p>
            <h1
              className="mt-4 font-instrument font-normal leading-[1.05] tracking-tight text-foreground text-shadow-soft"
              style={{ fontSize: "clamp(2.75rem, 2rem + 3vw, 4.25rem)" }}
            >
              The calm way to manage your day.
            </h1>
            <p className="mt-6 max-w-md text-base text-muted-foreground md:text-lg">
              Zenith brings planning, focus, and review into one clear daily
              rhythm, so you start the day clear and end it in control.
            </p>
          </AnimationWrapper>

          <AnimationWrapper delay={0.1}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button variant="brand" size="lg" asChild>
                <Link href="/signup">Start for free</Link>
              </Button>
              <Button variant="ghost" size="lg" asChild>
                <a href="#features">See how it works</a>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Free plan available. 7 day Pro trial, no card needed.
            </p>
          </AnimationWrapper>
        </div>

        {/* Product surface */}
        <div className="relative lg:col-span-7">
          <AnimationWrapper
            delay={0.3}
            className="absolute -bottom-6 -right-3 z-10 hidden sm:block sm:-bottom-8 sm:-right-6"
          >
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-2 shadow-inset-soft">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-health-soft text-tag-health">
                <Sunrise className="h-3 w-3" />
              </span>
              <span className="text-[11px] font-medium text-foreground">
                Rituals done
              </span>
            </div>
          </AnimationWrapper>

          <AnimationWrapper delay={0.2}>
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                  <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                  <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                </div>
                <span className="text-xs text-muted-foreground">
                  Today, Tuesday July 14
                </span>
              </div>

              <div className="flex">
                <div className="flex w-12 shrink-0 flex-col gap-1 border-r border-border p-2 sm:w-36 sm:p-3">
                  {railItems.map((item) => {
                    const isActive = activeView === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveView(item.id)}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "relative flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-xs transition-colors duration-300",
                          isActive
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="hero-rail-indicator"
                            className="absolute inset-0 rounded-lg bg-muted"
                            transition={{
                              type: "spring",
                              stiffness: 420,
                              damping: 34,
                              mass: 0.75,
                            }}
                          />
                        )}
                        <item.icon className="relative z-10 h-4 w-4 shrink-0" />
                        <span className="relative z-10 hidden sm:inline">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="min-w-0 flex-1 p-4 sm:p-5">
                  <div className="h-4 overflow-hidden">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.p
                        key={activeView}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 32,
                          mass: 0.7,
                        }}
                        className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        {panelMeta[activeView].heading}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                  <div className="relative mt-3 min-h-[248px]">
                    <AnimatePresence initial={false}>
                      <motion.div
                        key={activeView}
                        initial={{ opacity: 0, x: 14, filter: "blur(6px)" }}
                        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, x: -14, filter: "blur(6px)" }}
                        transition={{
                          type: "spring",
                          stiffness: 360,
                          damping: 32,
                          mass: 0.85,
                        }}
                        className="absolute inset-0"
                      >
                        <ActivePanel />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </AnimationWrapper>

          <AnimationWrapper
            delay={0.4}
            className="absolute -bottom-6 -left-3 z-10 sm:-bottom-8 sm:-left-6"
          >
            <HeroFocusBadge />
          </AnimationWrapper>
        </div>
      </div>
    </section>
  );
};

export default Hero;
