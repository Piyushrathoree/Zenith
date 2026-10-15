import { format, parseISO } from "date-fns";
import { CalendarCheck, Clock, EyeOff } from "lucide-react";
import { useStore } from "@/store/useStore";
import { itemKey, taskKey, type IntegrationItem } from "@/lib/integrationTasks";
import { cn } from "@/lib/utils";

/**
 * The slim row under each integration card: where the item is planned (click to open the task),
 * or one click buttons to add it to today, tomorrow, or the backlog. Sits outside the card so
 * the card itself keeps its look.
 */
export function IntegrationItemActions({ item, className }: { item: IntegrationItem; className?: string }) {
  const tasks = useStore((state) => state.tasks);
  const backlogTasks = useStore((state) => state.backlogTasks);
  const addIntegrationItem = useStore((state) => state.addIntegrationItem);
  const hideIntegrationItem = useStore((state) => state.hideIntegrationItem);
  const setSelectedTask = useStore((state) => state.setSelectedTask);
  const setShowTaskModal = useStore((state) => state.setShowTaskModal);

  const key = itemKey(item);
  const planned = tasks.find((task) => taskKey(task) === key) ?? backlogTasks.find((task) => taskKey(task) === key);

  if (planned) {
    const label = planned.completed
      ? "Done"
      : planned.inBacklog
        ? "In backlog"
        : `On ${format(parseISO(planned.date), "EEE d")}`;
    return (
      <div className={cn("flex justify-end", className)}>
        <button
          type="button"
          onClick={() => {
            setSelectedTask(planned);
            setShowTaskModal(true);
          }}
          className="flex items-center gap-1 rounded-lg border border-brand/30 bg-brand-soft px-2 py-1 text-xs text-brand"
          title="Open the task"
        >
          <CalendarCheck className="h-3.5 w-3.5" />
          {label}
        </button>
      </div>
    );
  }

  const buttons: { label: string; target: "today" | "tomorrow" | "backlog" }[] = [
    { label: "+ Today", target: "today" },
    { label: "+ Tomorrow", target: "tomorrow" },
    { label: "+ Backlog", target: "backlog" },
  ];

  return (
    <div className={cn("flex items-center justify-end gap-1", className)}>
      <button
        type="button"
        onClick={() => void hideIntegrationItem(item, true)}
        title="Snooze until tomorrow"
        aria-label="Snooze until tomorrow"
        className="mr-auto rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Clock className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => void hideIntegrationItem(item)}
        title="Hide"
        aria-label="Hide"
        className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <EyeOff className="h-3.5 w-3.5" />
      </button>
      {buttons.map((button) => (
        <button
          key={button.target}
          type="button"
          onClick={() => void addIntegrationItem(item, button.target)}
          className="rounded-lg border border-foreground/10 px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
        >
          {button.label}
        </button>
      ))}
    </div>
  );
}
