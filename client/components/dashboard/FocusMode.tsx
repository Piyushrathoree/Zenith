import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Play, Pause, RotateCcw, Minus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

const DURATIONS = [15, 25, 45, 60];

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function FocusMode() {
  const {
    focusMode,
    focusMinimized,
    focusTask,
    focusTitle,
    focusTimeLeft,
    focusRunning,
    focusDurationMin,
    tasks,
    setFocusMode,
    setFocusTask,
    setFocusTitle,
    setFocusDurationMin,
    setFocusRunning,
    tickFocus,
    resetFocusTimer,
    minimizeFocus,
    exitFocus,
  } = useApp();

  const openTasks = tasks.filter((task) => !task.completed);
  const label = focusTitle.trim();
  const progress =
    ((focusDurationMin * 60 - focusTimeLeft) / (focusDurationMin * 60)) * 100;

  const closeOrMinimize = useCallback(() => {
    if (focusRunning) {
      minimizeFocus();
      return;
    }
    exitFocus();
  }, [focusRunning, minimizeFocus, exitFocus]);

  useEffect(() => {
    if (!focusRunning) return;
    const interval = window.setInterval(() => tickFocus(), 1000);
    return () => window.clearInterval(interval);
  }, [focusRunning, tickFocus]);

  useEffect(() => {
    if (!focusMode && !focusMinimized) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (event.key === "Escape") {
        event.preventDefault();
        closeOrMinimize();
        return;
      }

      if (event.key === " " && !typing && focusMode) {
        event.preventDefault();
        setFocusRunning(!focusRunning);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusMode, focusMinimized, focusRunning, closeOrMinimize, setFocusRunning]);

  return (
    <>
      <AnimatePresence>
        {focusMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
          >
            <div className="absolute top-6 right-6 flex items-center gap-1">
              {focusRunning && (
                <button
                  type="button"
                  onClick={minimizeFocus}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Minimize timer"
                >
                  <Minus className="h-5 w-5" />
                </button>
              )}
              <button
                type="button"
                onClick={closeOrMinimize}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close focus"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="absolute top-6 left-1/2 flex -translate-x-1/2 gap-2 rounded-lg bg-muted p-1">
              {DURATIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setFocusDurationMin(minutes)}
                  className={cn(
                    "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                    focusDurationMin === minutes
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {minutes} min
                </button>
              ))}
            </div>

            <div className="relative">
              <svg className="h-80 w-80 -rotate-90 transform">
                <circle
                  cx="160"
                  cy="160"
                  r="150"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-muted"
                />
                <motion.circle
                  cx="160"
                  cy="160"
                  r="150"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  className="text-brand"
                  initial={{ strokeDasharray: 942, strokeDashoffset: 942 }}
                  animate={{ strokeDashoffset: 942 - (942 * progress) / 100 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-7xl font-light tracking-tight text-foreground">
                  {formatTime(focusTimeLeft)}
                </span>
                <span className="mt-2 text-sm text-muted-foreground">
                  {focusRunning ? "Focus time" : "Ready to focus"}
                </span>
              </div>
            </div>

            <div className="mt-8 w-full max-w-md px-6">
              <input
                type="text"
                value={focusTitle}
                onChange={(e) => setFocusTitle(e.target.value)}
                placeholder="What are you focusing on?"
                className="w-full border-b border-foreground/15 bg-transparent pb-2 text-center text-xl font-medium text-foreground outline-none placeholder:text-muted-foreground"
              />
              {focusTask && (
                <p
                  className={cn(
                    "mt-2 text-center text-sm",
                    focusTask.tag === "work" && "text-tag-work",
                    focusTask.tag === "personal" && "text-tag-personal",
                    focusTask.tag === "health" && "text-tag-health"
                  )}
                >
                  #{focusTask.tag}
                </p>
              )}
              {openTasks.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                  {openTasks.slice(0, 6).map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setFocusTask(task)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors",
                        focusTask?.id === task.id
                          ? "border-brand/40 bg-brand-soft text-brand"
                          : "border-foreground/10 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                      )}
                    >
                      {task.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-10 flex items-center gap-4">
              <button
                type="button"
                onClick={resetFocusTimer}
                className="rounded-full p-3 text-muted-foreground hover:bg-muted"
                aria-label="Reset timer"
              >
                <RotateCcw className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => setFocusRunning(!focusRunning)}
                className="rounded-full bg-brand p-6 text-brand-foreground shadow-sm hover:bg-brand/90"
                aria-label={focusRunning ? "Pause" : "Start"}
              >
                {focusRunning ? (
                  <Pause className="h-8 w-8" />
                ) : (
                  <Play className="ml-1 h-8 w-8" />
                )}
              </button>
              <div className="w-12" />
            </div>

            <p className="absolute bottom-6 text-sm text-muted-foreground">
              Press{" "}
              <kbd className="rounded bg-muted px-2 py-1 text-xs">Space</kbd> to{" "}
              {focusRunning ? "pause" : "start"} ·{" "}
              <kbd className="rounded bg-muted px-2 py-1 text-xs">Esc</kbd>{" "}
              {focusRunning ? "minimizes" : "exits"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {focusMinimized && !focusMode && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            onClick={() => setFocusMode(true)}
            className="fixed top-3 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-full border-2 border-foreground/15 bg-card px-3 py-2 shadow-soft"
          >
            <span className="font-medium tabular-nums text-foreground">
              {formatTime(focusTimeLeft)}
            </span>
            {label && (
              <span className="max-w-[220px] truncate text-sm text-muted-foreground">
                {label}
              </span>
            )}
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                setFocusRunning(!focusRunning);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  setFocusRunning(!focusRunning);
                }
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-brand-foreground"
            >
              {focusRunning ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="ml-0.5 h-3.5 w-3.5" />
              )}
            </span>
            <span
              role="button"
              tabIndex={0}
              aria-label="End focus"
              onClick={(event) => {
                event.stopPropagation();
                exitFocus();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  exitFocus();
                }
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
