import { useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatTime12h } from "@/lib/formatDate";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  SLOT_HEIGHT_PX,
  SLOT_MINUTES,
  blockGeometry,
  findOverlaps,
  minutesToTime,
  slotTimes,
} from "@/lib/timebox";
import type { Task } from "@/types";
import { TimeBlock } from "./TimeBlock";

/** One 15 minute row. Dropping a task here gives it this start time on this day. */
function TimeSlot({ date, time, top }: { date: string; time: string; top: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${date}-${time}`,
    data: { type: "timeslot", date, time },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn("absolute left-16 right-0", isOver && "bg-brand-soft/60")}
      style={{ top, height: SLOT_HEIGHT_PX }}
    />
  );
}

function currentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/** The vertical timeline for one day. Scheduled tasks are blocks on it. */
export function TimeGrid({
  date,
  tasks,
  scrollToFirstTask = false,
}: {
  date: string;
  tasks: Task[];
  /** Open on the earliest scheduled block instead of the current time. Used by daily planning. */
  scrollToFirstTask?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nowMinutes, setNowMinutes] = useState(currentMinutes);
  const isToday = date === format(new Date(), "yyyy-MM-dd");

  const slots = slotTimes();
  const overlaps = findOverlaps(tasks);
  const nowTop = (nowMinutes - DAY_START_HOUR * 60) * (SLOT_HEIGHT_PX / SLOT_MINUTES);
  const showNow = isToday && nowMinutes >= DAY_START_HOUR * 60 && nowMinutes < DAY_END_HOUR * 60;

  // Keep the red "now" line current.
  useEffect(() => {
    const timer = window.setInterval(() => setNowMinutes(currentMinutes()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // When the day changes, bring the current time (or the first block) into view.
  useEffect(() => {
    if (!containerRef.current) return;
    const first = tasks
      .map((task) => task.time)
      .filter((time): time is string => Boolean(time))
      .sort()[0];
    const target = scrollToFirstTask && first ? first : isToday ? minutesToTime(currentMinutes()) : null;
    if (!target) return;
    const { top } = blockGeometry(target, "0:15");
    containerRef.current.scrollTop = Math.max(0, top - 120);
    // Runs on day change only. Re-running on every task or minute change would fight the user's scrolling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  return (
    <div ref={containerRef} className="relative flex-1 overflow-y-auto">
      <div className="relative" style={{ height: slots.length * SLOT_HEIGHT_PX }}>
        {slots.map((time, index) => {
          const top = index * SLOT_HEIGHT_PX;
          const isHour = time.endsWith(":00");
          return (
            <div key={time}>
              {isHour && (
                <>
                  <span
                    className="absolute left-2 -translate-y-1/2 text-[11px] text-muted-foreground"
                    style={{ top }}
                  >
                    {formatTime12h(time)}
                  </span>
                  <div className="absolute left-16 right-0 border-t border-border" style={{ top }} />
                </>
              )}
              <TimeSlot date={date} time={time} top={top} />
            </div>
          );
        })}

        {showNow && (
          <div
            className="pointer-events-none absolute left-14 right-0 z-10 border-t-2 border-destructive"
            style={{ top: nowTop }}
          />
        )}

        {tasks.map((task) => (
          <TimeBlock key={task.id} task={task} overlapping={overlaps.has(task.id)} />
        ))}
      </div>
    </div>
  );
}
