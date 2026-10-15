import { useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { useDraggable } from "@dnd-kit/core";
import { ListChecks, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatMinutes } from "@/lib/formatDate";
import { durationToMinutes } from "@/lib/timebox";
import { useStore } from "@/store/useStore";
import type { Task } from "@/types";
import type { WeeklyStatsDTO } from "@/lib/api/weekly";

// Small building blocks shared by the ritual flows. Same visual language as the
// existing weekly rituals panel: soft muted rows, 2px rounded borders, chip buttons.

export function SectionTitle({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
      {icon}
      {children}
    </h3>
  );
}

export function StatsCard({ title, stats }: { title: string; stats: WeeklyStatsDTO }) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm text-foreground">
        {stats.doneCount} of {stats.plannedCount} tasks done
      </p>
      <p className="text-xs text-muted-foreground">
        {formatMinutes(stats.doneMinutes)} of {formatMinutes(stats.plannedMinutes)} focused
      </p>
    </div>
  );
}

/** Small chip button, same style as the duration and repeat chips. */
export function Chip({
  children,
  onClick,
  active,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "rounded-lg border px-2 py-1 text-xs transition-colors",
        active
          ? "border-brand/40 bg-brand-soft text-brand"
          : "border-foreground/10 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

/**
 * One task row inside a ritual. `actions` render on the right. When `draggable` is set the row
 * can be dragged onto a day or a time slot, using the same drag types the board already handles.
 */
export function RitualTaskRow({
  task,
  actions,
  draggable,
  muted,
}: {
  task: Task;
  actions?: ReactNode;
  draggable?: "task" | "backlog-task";
  muted?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `ritual-${draggable ?? "static"}-${task.id}`,
    data: { type: draggable ?? "none", task },
    disabled: !draggable,
  });

  return (
    <div
      ref={setNodeRef}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2",
        draggable && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <div className="min-w-0">
        <p className={cn("truncate text-sm", muted ? "text-muted-foreground line-through" : "text-foreground")}>
          {task.title}
        </p>
        <p className="text-xs text-muted-foreground">
          #{task.tag} · {formatMinutes(durationToMinutes(task.duration))}
        </p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap justify-end gap-1">{actions}</div>}
    </div>
  );
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/** Weekly goals and top priorities, saved on the server as they change. */
export function WeeklyGoalsEditor() {
  const goals = useStore((state) => state.weeklyGoals);
  const priorities = useStore((state) => state.weeklyPriorities);
  const addWeeklyGoal = useStore((state) => state.addWeeklyGoal);
  const removeWeeklyGoal = useStore((state) => state.removeWeeklyGoal);
  const updateWeeklyGoalProgress = useStore((state) => state.updateWeeklyGoalProgress);
  const addWeeklyPriority = useStore((state) => state.addWeeklyPriority);
  const removeWeeklyPriority = useStore((state) => state.removeWeeklyPriority);
  const [newGoal, setNewGoal] = useState("");
  const [newPriority, setNewPriority] = useState("");

  const handleAddGoal = () => {
    if (!newGoal.trim()) return;
    addWeeklyGoal(newGoal);
    setNewGoal("");
  };
  const handleAddPriority = () => {
    if (!newPriority.trim()) return;
    addWeeklyPriority(newPriority);
    setNewPriority("");
  };

  return (
    <>
      <div>
        <SectionTitle icon={<Sparkles className="h-4 w-4 text-muted-foreground" />}>Weekly goals</SectionTitle>
        <div className="space-y-3">
          {goals.length === 0 && <EmptyLine>No goals this week yet. Add one below.</EmptyLine>}
          {goals.map((goal) => (
            <div key={goal.id} className="group rounded-lg border border-foreground/10 bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-foreground">{goal.title}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateWeeklyGoalProgress(goal.id, -1)}
                    aria-label="Less progress"
                    className="flex h-6 w-6 items-center justify-center rounded bg-muted text-sm hover:bg-muted/80"
                  >
                    -
                  </button>
                  <span className="min-w-[40px] text-center text-sm font-medium text-brand">
                    {goal.progress}/{goal.target}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateWeeklyGoalProgress(goal.id, 1)}
                    aria-label="More progress"
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

      <div>
        <SectionTitle icon={<ListChecks className="h-4 w-4 text-muted-foreground" />}>Top priorities</SectionTitle>
        <div className="space-y-2">
          {priorities.length === 0 && <EmptyLine>No priorities this week yet. Add one below.</EmptyLine>}
          {priorities.map((priority, idx) => (
            <div key={`${priority}-${idx}`} className="group flex items-center gap-3 rounded-lg bg-muted/30 p-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-sm font-medium text-brand">
                {idx + 1}
              </span>
              <span className="flex-1 text-sm text-foreground">{priority}</span>
              <button
                onClick={() => removeWeeklyPriority(idx)}
                aria-label="Remove priority"
                className="rounded p-1 opacity-0 transition-all hover:bg-destructive/20 group-hover:opacity-100"
              >
                <X className="h-4 w-4 text-destructive" />
              </button>
            </div>
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
    </>
  );
}

/**
 * Loads data for `key` when the flow mounts (flows only mount while open) and whenever the key
 * changes. `load` should be a module level function, so its identity never changes.
 * Returns [data, reload].
 */
export function useFlowData<T>(key: string, load: (key: string) => Promise<T>): [T | null, () => void] {
  const [data, setData] = useState<T | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load(key)
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [key, load, nonce]);

  return [data, () => setNonce((n) => n + 1)];
}
