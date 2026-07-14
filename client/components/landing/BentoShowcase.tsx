"use client";
import React, { useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  Kanban,
  Moon,
  Sunrise,
  Timer,
} from "lucide-react";
import { AnimationWrapper } from "@/components/ui/animation-wrapper";
import { cn } from "@/lib/utils";

type MiniTask = {
  id: string;
  title: string;
  tag: "work" | "personal" | "health";
};

type MiniColumn = {
  label: string;
  tasks: MiniTask[];
};

const initialDayBoardColumns: MiniColumn[] = [
  {
    label: "To do",
    tasks: [
      { id: "email", title: "Write launch email", tag: "work" },
      { id: "dentist", title: "Book dentist", tag: "health" },
    ],
  },
  {
    label: "In progress",
    tasks: [
      { id: "design", title: "Design review", tag: "work" },
      { id: "call", title: "Call mom", tag: "personal" },
    ],
  },
];

const tagDotClass: Record<MiniTask["tag"], string> = {
  work: "bg-[var(--color-tag-work)]",
  personal: "bg-[var(--color-tag-personal)]",
  health: "bg-[var(--color-tag-health)]",
};

type HourBlock = {
  hour: string;
  label?: string;
};

const timelineHours: HourBlock[] = [
  { hour: "9 AM", label: "Team standup" },
  { hour: "10 AM" },
  { hour: "11 AM", label: "Deep work: roadmap" },
];

type RitualItem = {
  label: string;
  done: boolean;
};

const initialMorningRituals: RitualItem[] = [
  { label: "Set today's top 3", done: true },
  { label: "Review calendar", done: true },
  { label: "10 minute stretch", done: true },
];

const initialEveningRituals: RitualItem[] = [
  { label: "Close open loops", done: true },
  { label: "Evening review", done: false },
  { label: "Prep tomorrow's board", done: false },
];

const focusTasks = ["Design review", "Ship onboarding flow", "Morning walk"] as const;

const FOCUS_RADIUS = 42;
const FOCUS_CIRCUMFERENCE = 2 * Math.PI * FOCUS_RADIUS;

const focusDurations = [15, 25, 45] as const;
type FocusDuration = (typeof focusDurations)[number];

function RitualChecklist({
  items,
  emptyClassName,
  onToggle,
}: {
  items: RitualItem[];
  emptyClassName: string;
  onToggle: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onToggle(index)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors",
            item.done
              ? "border-transparent bg-health-soft text-tag-health"
              : `${emptyClassName} text-muted-foreground hover:border-brand/25 hover:bg-card/80 hover:text-foreground`
          )}
        >
          {item.done ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <Circle className="h-3.5 w-3.5 shrink-0" />
          )}
          {item.label}
        </button>
      ))}
    </div>
  );
}

function FocusTimerPreview({
  minutes,
  progress,
}: {
  minutes: number;
  progress: number;
}) {
  const strokeDashoffset = FOCUS_CIRCUMFERENCE * (1 - progress);

  return (
    <div className="relative h-36 w-36">
      <svg
        viewBox="0 0 96 96"
        className="h-36 w-36 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="48"
          cy="48"
          r={FOCUS_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-border"
        />
        <circle
          cx="48"
          cy="48"
          r={FOCUS_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          className="text-brand transition-[stroke-dashoffset] duration-300 ease-out"
          strokeDasharray={FOCUS_CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-medium tabular-nums text-foreground">
          {minutes}:00
        </span>
        <span className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
          Focus
        </span>
      </div>
    </div>
  );
}

function FocusTimerCard() {
  const [duration, setDuration] = useState<FocusDuration>(25);
  const [taskIndex, setTaskIndex] = useState(0);

  const progressByDuration: Record<FocusDuration, number> = {
    15: 0.28,
    25: 0.62,
    45: 0.44,
  };

  const focusTask = focusTasks[taskIndex];

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-inset-soft md:p-6">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Timer className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-medium text-foreground">Focus timer</h3>
      </div>

      <div className="inset-sunken mt-4 flex flex-1 flex-col items-center justify-center rounded-xl bg-background px-4 py-6">
        <FocusTimerPreview
          minutes={duration}
          progress={progressByDuration[duration]}
        />
      </div>

      <button
        type="button"
        onClick={() => setTaskIndex((prev) => (prev + 1) % focusTasks.length)}
        className="mt-4 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-brand/30 hover:bg-brand-soft/40"
      >
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Now focusing on
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground">{focusTask}</p>
      </button>

      <div className="mt-3 flex justify-center gap-2">
        {focusDurations.map((minutes) => (
          <button
            key={minutes}
            type="button"
            aria-pressed={duration === minutes}
            onClick={() => setDuration(minutes)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              duration === minutes
                ? "bg-brand-soft text-brand"
                : "border border-border bg-background text-muted-foreground hover:border-brand/30 hover:text-foreground"
            )}
          >
            {minutes}m
          </button>
        ))}
      </div>

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        Tap duration or task to explore
      </p>
    </div>
  );
}

function DayBoardCard() {
  return (
    <div className="h-full rounded-2xl border border-border bg-card p-5 shadow-inset-soft md:p-6">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-work-soft text-tag-work">
          <Kanban className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-medium text-foreground">Day board</h3>
      </div>

      <div className="inset-sunken mt-4 grid grid-cols-1 gap-4 rounded-xl bg-background p-3 sm:grid-cols-2">
        {initialDayBoardColumns.map((column) => (
          <div key={column.label} className="flex flex-col gap-2">
            <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {column.label}
            </p>
            <div className="flex flex-col gap-2">
              {column.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2"
                >
                  <span className="text-xs text-foreground">{task.title}</span>
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${tagDotClass[task.tag]}`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyPlannerCard() {
  return (
    <div className="h-full rounded-2xl border border-border bg-card p-5 shadow-inset-soft md:p-6">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-personal-soft text-tag-personal">
          <CalendarClock className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-medium text-foreground">Daily planner</h3>
      </div>

      <div className="inset-sunken mt-4 flex flex-col gap-1.5 rounded-xl bg-background p-3">
        {timelineHours.map((block) => (
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
    </div>
  );
}

function RitualsCard() {
  const [morningRituals, setMorningRituals] = useState(initialMorningRituals);
  const [eveningRituals, setEveningRituals] = useState(initialEveningRituals);

  const completedCount = useMemo(
    () =>
      [...morningRituals, ...eveningRituals].filter((item) => item.done).length,
    [morningRituals, eveningRituals]
  );

  const toggleMorning = (index: number) => {
    setMorningRituals((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, done: !item.done } : item
      )
    );
  };

  const toggleEvening = (index: number) => {
    setEveningRituals((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, done: !item.done } : item
      )
    );
  };

  return (
    <div className="h-full rounded-2xl border border-border bg-card p-5 shadow-inset-soft md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-health-soft text-tag-health">
            <Sunrise className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-medium text-foreground">
            Morning and evening rituals
          </h3>
        </div>
        <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
          {completedCount} of 6 complete
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="inset-sunken rounded-xl bg-background p-3">
          <div className="mb-3 flex items-center gap-2">
            <Sunrise className="h-3.5 w-3.5 text-tag-health" />
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Morning · 7:00 AM
            </p>
          </div>
          <RitualChecklist
            items={morningRituals}
            emptyClassName="border-border bg-card"
            onToggle={toggleMorning}
          />
        </div>

        <div className="inset-sunken rounded-xl bg-background p-3">
          <div className="mb-3 flex items-center gap-2">
            <Moon className="h-3.5 w-3.5 text-tag-personal" />
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Evening · 6:30 PM
            </p>
          </div>
          <RitualChecklist
            items={eveningRituals}
            emptyClassName="border-border bg-card"
            onToggle={toggleEvening}
          />
        </div>
      </div>
    </div>
  );
}

export const BentoShowcase = () => {
  return (
    <section className="relative overflow-hidden bg-paper py-24 md:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-8 h-64 w-64 -translate-x-1/2 rounded-full bg-brand-soft opacity-40 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-6">
        <AnimationWrapper delay={0}>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              The workspace
            </p>
            <h2 className="mx-auto mt-4 font-instrument text-4xl font-semibold leading-[1.1] tracking-tight text-foreground text-shadow-soft sm:text-5xl">
              Everything for a calm day, in one place.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">
              One board to plan, one timer to focus, one timeline for the day,
              and a short ritual to close it out.
            </p>
          </div>
        </AnimationWrapper>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* 1. Day board */}
          <AnimationWrapper delay={0.1} className="relative md:col-span-2">
            <DayBoardCard />
            <div
              aria-hidden="true"
              className="absolute -right-2.5 -top-2.5 hidden h-9 w-9 items-center justify-center rounded-xl border border-border bg-card shadow-inset-soft sm:flex"
            >
              <Kanban className="h-4 w-4 text-tag-work" />
            </div>
          </AnimationWrapper>

          {/* 2. Focus timer */}
          <AnimationWrapper
            delay={0.15}
            className="md:col-span-1 md:row-span-2"
          >
            <FocusTimerCard />
          </AnimationWrapper>

          {/* 3. Daily planner */}
          <AnimationWrapper delay={0.2} className="md:col-span-2">
            <DailyPlannerCard />
          </AnimationWrapper>

          {/* 4. Morning and evening rituals */}
          <AnimationWrapper delay={0.25} className="md:col-span-3">
            <RitualsCard />
          </AnimationWrapper>
        </div>
      </div>
    </section>
  );
};
