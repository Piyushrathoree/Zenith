import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";
import { TaskCard } from "@/components/dashboard/kanban/TaskCard";

/** Tasks on this day with no time yet. Dropping a timed block here clears its time. */
export function UnscheduledList({ date, tasks }: { date: string; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `unscheduled-${date}`,
    data: { type: "unscheduled", date },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-64 shrink-0 space-y-2 overflow-y-auto border-r border-border p-3 transition-colors",
        isOver && "bg-brand-soft/40"
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Unscheduled
      </p>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Everything on this day has a time.</p>
      ) : (
        tasks.map((task) => <TaskCard key={task.id} task={task} />)
      )}
    </div>
  );
}
