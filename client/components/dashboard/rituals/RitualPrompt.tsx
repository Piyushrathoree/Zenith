import { useState } from "react";
import { format } from "date-fns";
import { Sunrise, Target, X } from "lucide-react";
import { useStore } from "@/store/useStore";

/**
 * A quiet line above the board that suggests the ritual that has not happened yet:
 * "Plan your day" until today is planned, "Plan your week" on the first day of the week.
 * Dismissible for the session.
 */
export function RitualPrompt() {
  const plannerLoaded = useStore((state) => state.plannerLoaded);
  const todayRitual = useStore((state) => state.todayRitual);
  const weekKey = useStore((state) => state.weeklyWeekKey);
  const weeklyPlanningCompletedAt = useStore((state) => state.weeklyPlanningCompletedAt);
  const setDailyRitual = useStore((state) => state.setDailyRitual);
  const setShowWeeklyRituals = useStore((state) => state.setShowWeeklyRituals);
  const [dismissed, setDismissed] = useState(false);

  if (!plannerLoaded || dismissed) return null;
  const today = format(new Date(), "yyyy-MM-dd");
  const weekPrompt = weekKey === today && !weeklyPlanningCompletedAt;
  const dayPrompt = !todayRitual.plannedAt;
  if (!weekPrompt && !dayPrompt) return null;

  return (
    <div className="mx-3 mt-3 flex items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-2 text-sm text-foreground">
        {weekPrompt ? <Target className="h-4 w-4 text-brand" /> : <Sunrise className="h-4 w-4 text-tag-work" />}
        {weekPrompt ? "A new week. Take five minutes to plan it." : "Your day isn't planned yet."}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => (weekPrompt ? setShowWeeklyRituals(true, "planning") : setDailyRitual("planning"))}
          className="rounded-lg px-2.5 py-1 text-xs font-medium text-brand hover:bg-brand-soft"
        >
          {weekPrompt ? "Plan your week" : "Plan your day"}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="rounded p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
