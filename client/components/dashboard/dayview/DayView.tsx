import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, format, parseISO } from "date-fns";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { formatMinutes } from "@/lib/formatDate";
import { DEFAULT_DAILY_CAPACITY_MINUTES, plannedMinutes } from "@/lib/timebox";
import { TimeGrid } from "./TimeGrid";
import { UnscheduledList } from "./UnscheduledList";

/** One day as a timeline. Drag tasks onto a time to schedule them. */
export function DayView() {
  const { tasks, dayViewDate, setDayViewDate } = useApp();

  const current = parseISO(dayViewDate);
  const dayTasks = tasks.filter((task) => task.date === dayViewDate);
  const scheduled = dayTasks.filter((task) => task.time);
  const unscheduled = dayTasks.filter((task) => !task.time);

  const planned = plannedMinutes(dayTasks);
  const overplanned = planned > DEFAULT_DAILY_CAPACITY_MINUTES;

  const shiftDay = (days: number) =>
    setDayViewDate(format(addDays(current, days), "yyyy-MM-dd"));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftDay(-1)}
            aria-label="Previous day"
            className="rounded p-1 hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="min-w-[140px] text-center text-sm font-medium text-foreground">
            {format(current, "EEE, MMM d")}
          </p>
          <button
            type="button"
            onClick={() => shiftDay(1)}
            aria-label="Next day"
            className="rounded p-1 hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDayViewDate(format(new Date(), "yyyy-MM-dd"))}
            className="ml-2 rounded-md px-2 py-1 text-xs hover:bg-muted"
          >
            Today
          </button>
        </div>

        <p className={cn("text-xs", overplanned ? "font-medium text-destructive" : "text-muted-foreground")}>
          Planned {formatMinutes(planned)} of {formatMinutes(DEFAULT_DAILY_CAPACITY_MINUTES)}
          {overplanned && " · Overplanned"}
        </p>
      </div>

      <div className="flex min-h-0 flex-1">
        <UnscheduledList date={dayViewDate} tasks={unscheduled} />
        <TimeGrid date={dayViewDate} tasks={scheduled} />
      </div>
    </div>
  );
}
