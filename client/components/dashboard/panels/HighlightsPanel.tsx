import { AnimatePresence, motion } from "motion/react";
import { format, parseISO } from "date-fns";
import { Sparkles, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { listHighlights } from "@/lib/api/rituals";
import { useFlowData } from "@/components/dashboard/rituals/RitualParts";

const loadHighlights = () => listHighlights();

/** Read only journal of past daily highlights (Phase 8). Same docked style as the backlog panel. */
export function HighlightsPanel() {
  const { setShowHighlights } = useApp();
  const [days] = useFlowData("recent", loadHighlights);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex h-screen w-sidebar flex-col overflow-hidden border-l border-border bg-card/95 shadow-soft backdrop-blur-sm"
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Daily highlights</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowHighlights(false)}
            className="rounded p-1 transition-colors hover:bg-muted"
            aria-label="Close highlights"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {days === null && <p className="px-1 text-sm text-muted-foreground">Loading...</p>}
          {days && days.length === 0 && (
            <p className="px-1 text-sm text-muted-foreground">
              No highlights yet. Close your day with a daily shutdown to start your journal.
            </p>
          )}
          {days?.map((day) => (
            <div key={day.date} className="rounded-lg border border-foreground/10 bg-card px-3 py-2">
              <p className="text-xs text-muted-foreground">{format(parseISO(day.date), "EEE, MMM d")}</p>
              {day.highlight && <p className="mt-1 text-sm text-foreground">{day.highlight}</p>}
              {day.reflection && <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{day.reflection}</p>}
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
