import { motion, AnimatePresence } from "motion/react";
import { X, Calendar, ListChecks, TrendingUp, Target, Sparkles } from "lucide-react";
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";

interface WeeklyRitualsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'planning' | 'review';
}

// Goals/priorities now live in the Zustand store (see the WeeklyGoal slice
// in store/useStore.ts) instead of a local useState, so they stay
// consistent for the session and across remounts of this panel. There is
// still no backend "rituals" model, so none of this survives a full page
// reload or syncs across devices yet - that needs a future backend model,
// this is a client-only, in-session improvement.
export function WeeklyRitualsPanel({ isOpen, onClose, type }: WeeklyRitualsPanelProps) {
  const goals = useStore((state) => state.weeklyGoals);
  const priorities = useStore((state) => state.weeklyPriorities);
  const addWeeklyGoal = useStore((state) => state.addWeeklyGoal);
  const removeWeeklyGoal = useStore((state) => state.removeWeeklyGoal);
  const updateWeeklyGoalProgress = useStore((state) => state.updateWeeklyGoalProgress);
  const addWeeklyPriority = useStore((state) => state.addWeeklyPriority);
  const removeWeeklyPriority = useStore((state) => state.removeWeeklyPriority);

  // Uncommitted input text stays local - only the committed goals/
  // priorities themselves need to live in the shared store.
  const [newGoal, setNewGoal] = useState('');
  const [newPriority, setNewPriority] = useState('');

  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(new Date());

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleAddGoal = () => {
    if (newGoal.trim()) {
      addWeeklyGoal(newGoal);
      setNewGoal('');
    }
  };

  const handleAddPriority = () => {
    if (newPriority.trim()) {
      addWeeklyPriority(newPriority);
      setNewPriority('');
    }
  };

  const updateGoalProgress = (id: string, increment: number) => {
    updateWeeklyGoalProgress(id, increment);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 z-50 flex max-h-[80vh] flex-col overflow-hidden rounded-2xl border-2 border-foreground/15 bg-card shadow-soft md:inset-auto md:left-1/2 md:top-1/2 md:h-auto md:w-[560px] md:-translate-x-1/2 md:-translate-y-1/2"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5">
              <div className="flex items-center gap-3">
                {type === "planning" ? (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft">
                    <Target className="h-5 w-5 text-brand" />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-health-soft">
                    <TrendingUp className="h-5 w-5 text-tag-health" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {type === "planning" ? "Weekly planning" : "Weekly review"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Week Overview */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Week Overview
                </h3>
                <div className="grid grid-cols-7 gap-1">
                  {weekDays.map((day, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "text-center p-2 rounded-lg",
                        format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                          ? "bg-brand-soft text-brand"
                          : "bg-muted/50"
                      )}
                    >
                      <p className="text-xs font-medium">{format(day, 'EEE')}</p>
                      <p className="text-lg font-semibold">{format(day, 'd')}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly Goals */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                  Weekly Goals
                </h3>
                <div className="space-y-3">
                  {goals.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No goals this week yet. Add one below.
                    </p>
                  )}
                  {goals.map((goal) => (
                    <div key={goal.id} className="group rounded-lg border border-foreground/10 bg-muted/30 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-foreground">{goal.title}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateGoalProgress(goal.id, -1)}
                            className="flex h-6 w-6 items-center justify-center rounded bg-muted text-sm hover:bg-muted/80"
                          >
                            -
                          </button>
                          <span className="min-w-[40px] text-center text-sm font-medium text-brand">
                            {goal.progress}/{goal.target}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateGoalProgress(goal.id, 1)}
                            className="flex h-6 w-6 items-center justify-center rounded bg-brand text-sm text-brand-foreground hover:bg-brand/90"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => removeWeeklyGoal(goal.id)}
                            className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100"
                            aria-label="Remove goal"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(goal.progress / goal.target) * 100}%` }}
                          className="h-full rounded-full bg-brand"
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newGoal}
                      onChange={(e) => setNewGoal(e.target.value)}
                      placeholder="Add a new goal..."
                      className="flex-1 rounded-lg border border-foreground/10 bg-muted/40 px-3 py-2 text-sm outline-none focus:border-brand/40"
                      onKeyDown={(e) => e.key === "Enter" && handleAddGoal()}
                    />
                    <Button type="button" variant="brand" size="sm" onClick={handleAddGoal}>
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {/* Top Priorities */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-muted-foreground" />
                  Top Priorities
                </h3>
                <div className="space-y-2">
                  {priorities.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No priorities this week yet. Add one below.
                    </p>
                  )}
                  {priorities.map((priority, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-sm font-medium text-brand">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-foreground flex-1">{priority}</span>
                      <button
                        onClick={() => removeWeeklyPriority(idx)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-all"
                      >
                        <X className="w-4 h-4 text-destructive" />
                      </button>
                    </motion.div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                      placeholder="Add a priority..."
                      className="flex-1 rounded-lg border border-foreground/10 bg-muted/40 px-3 py-2 text-sm outline-none focus:border-brand/40"
                      onKeyDown={(e) => e.key === "Enter" && handleAddPriority()}
                    />
                    <Button type="button" variant="brand" size="sm" onClick={handleAddPriority}>
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-foreground/10 p-4">
              <Button type="button" variant="brand" className="w-full" onClick={onClose}>
                {type === "planning" ? "Start planning" : "Complete review"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
