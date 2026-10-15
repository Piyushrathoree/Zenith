import { useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { useDroppable } from "@dnd-kit/core";
import { CheckCircle2, History, Inbox, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { getWeeklySummary } from "@/lib/api/rituals";
import { mapToClientTask } from "@/lib/api/plannerMapping";
import { formatMinutes } from "@/lib/formatDate";
import { DEFAULT_DAILY_CAPACITY_MINUTES, plannedMinutes } from "@/lib/timebox";
import type { Task } from "@/types";
import { RitualFlow } from "./RitualFlow";
import { IntegrationPickList } from "./IntegrationPickList";
import { Chip, EmptyLine, RitualTaskRow, SectionTitle, StatsCard, WeeklyGoalsEditor, useFlowData } from "./RitualParts";

const keyOf = (date: Date) => format(date, "yyyy-MM-dd");

/** One day of the week, a drop target for backlog and board tasks. */
function WeekDayColumn({ date, tasks }: { date: string; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: `week-day-${date}`, data: { type: "week-day", date } });
  const minutes = plannedMinutes(tasks);
  const over = minutes > DEFAULT_DAILY_CAPACITY_MINUTES;
  const isToday = date === keyOf(new Date());

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-40 flex-col rounded-lg border border-foreground/10 bg-muted/30 p-2 transition-colors",
        isOver && "border-brand/40 bg-brand-soft"
      )}
    >
      <p className={cn("text-xs font-medium", isToday ? "text-brand" : "text-foreground")}>
        {format(parseISO(date), "EEE d")}
      </p>
      <p className={cn("mb-2 text-[11px]", over ? "font-medium text-destructive" : "text-muted-foreground")}>
        {formatMinutes(minutes)} of {formatMinutes(DEFAULT_DAILY_CAPACITY_MINUTES)}
      </p>
      <div className="space-y-1">
        {tasks.slice(0, 6).map((task) => (
          <p key={task.id} className={cn("truncate text-[11px]", task.completed ? "text-muted-foreground line-through" : "text-foreground")}>
            {task.title}
          </p>
        ))}
        {tasks.length > 6 && <p className="text-[11px] text-muted-foreground">+{tasks.length - 6} more</p>}
      </div>
    </div>
  );
}

/** Guided weekly planning (Phase 8): look back, goals, plan the week, wrap up. */
export function WeeklyPlanningFlow({ onClose }: { onClose: () => void }) {
  const weekKey = useStore((state) => state.weeklyWeekKey) || keyOf(new Date());
  const previousStats = useStore((state) => state.weeklyPreviousStats);
  const tasks = useStore((state) => state.tasks);
  const backlogTasks = useStore((state) => state.backlogTasks);
  const scheduleFromBacklog = useStore((state) => state.scheduleFromBacklog);
  const moveTask = useStore((state) => state.moveTask);
  const deleteTask = useStore((state) => state.deleteTask);
  const saveWeeklyPlan = useStore((state) => state.saveWeeklyPlan);
  const addIntegrationItem = useStore((state) => state.addIntegrationItem);

  const weekStart = parseISO(weekKey);
  const days = Array.from({ length: 7 }, (_, i) => keyOf(addDays(weekStart, i)));
  const today = keyOf(new Date());

  const [lastWeek] = useFlowData(keyOf(addDays(weekStart, -7)), getWeeklySummary);
  const [handled, setHandled] = useState<Set<string>>(new Set());
  const markHandled = (id: string) => setHandled((prev) => new Set(prev).add(id));

  const slipped = (lastWeek?.slipped ?? []).map(mapToClientTask).filter((task) => !handled.has(task.id));
  const done = (lastWeek?.done ?? []).map(mapToClientTask);

  // Pull a slipped task into this week: today, or the first day of the week when today is outside it.
  const targetDay = days.includes(today) ? today : days[0];
  const bringBack = (task: Task) => {
    if (backlogTasks.some((item) => item.id === task.id)) void scheduleFromBacklog(task.id, targetDay);
    else void moveTask(task.id, targetDay);
    markHandled(task.id);
  };

  const weekTasks = tasks.filter((task) => days.includes(task.date));
  const weekMinutes = plannedMinutes(weekTasks);
  const busyDays = days.filter((day) => weekTasks.some((task) => task.date === day)).length;

  const steps = [
    {
      title: "Look back",
      content: (
        <>
          {previousStats && previousStats.plannedCount > 0 && <StatsCard title="Last week" stats={previousStats} />}
          <div>
            <SectionTitle icon={<History className="h-4 w-4 text-muted-foreground" />}>What slipped</SectionTitle>
            <div className="space-y-2">
              {lastWeek && slipped.length === 0 && <EmptyLine>Nothing slipped last week.</EmptyLine>}
              {slipped.map((task) => (
                <RitualTaskRow
                  key={task.id}
                  task={task}
                  actions={
                    <>
                      <Chip onClick={() => bringBack(task)}>This week</Chip>
                      <Chip onClick={() => markHandled(task.id)}>Keep in backlog</Chip>
                      <Chip onClick={() => { void deleteTask(task.id); markHandled(task.id); }}>Delete</Chip>
                    </>
                  }
                />
              ))}
            </div>
          </div>
          <div>
            <SectionTitle icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}>What got done</SectionTitle>
            <div className="space-y-2">
              {lastWeek && done.length === 0 && <EmptyLine>No completed tasks last week.</EmptyLine>}
              {done.slice(0, 8).map((task) => <RitualTaskRow key={task.id} task={task} muted />)}
              {done.length > 8 && <EmptyLine>and {done.length - 8} more.</EmptyLine>}
            </div>
          </div>
        </>
      ),
    },
    { title: "Goals", content: <WeeklyGoalsEditor /> },
    {
      title: "Plan your week",
      content: (
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <div>
            <SectionTitle icon={<Inbox className="h-4 w-4 text-muted-foreground" />}>Backlog</SectionTitle>
            <p className="mb-2 text-xs text-muted-foreground">Drag onto a day, or pick a day.</p>
            <div className="space-y-2">
              {backlogTasks.length === 0 && <EmptyLine>Your backlog is empty.</EmptyLine>}
              {backlogTasks.map((task) => (
                <div key={task.id} className="space-y-1">
                  <RitualTaskRow task={task} draggable="backlog-task" />
                  <div className="flex flex-wrap gap-1">
                    {days.map((day) => (
                      <Chip key={day} title={format(parseISO(day), "EEEE")} onClick={() => void scheduleFromBacklog(task.id, day)}>
                        {format(parseISO(day), "EEEEE")}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <IntegrationPickList
                limit={8}
                renderActions={(item) =>
                  days.map((day) => (
                    <Chip key={day} title={format(parseISO(day), "EEEE")} onClick={() => void addIntegrationItem(item, day)}>
                      {format(parseISO(day), "EEEEE")}
                    </Chip>
                  ))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
            {days.map((day) => (
              <WeekDayColumn key={day} date={day} tasks={tasks.filter((task) => task.date === day)} />
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Wrap up",
      content: (
        <div className="rounded-lg border border-foreground/10 bg-muted/30 p-4">
          <p className="text-sm text-foreground">
            You planned {weekTasks.length} {weekTasks.length === 1 ? "task" : "tasks"}, {formatMinutes(weekMinutes)} across{" "}
            {busyDays} {busyDays === 1 ? "day" : "days"}.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">You can change anything later from the board.</p>
        </div>
      ),
    },
  ];

  return (
    <RitualFlow
      isOpen
      onClose={onClose}
      icon={<Target className="h-5 w-5 text-brand" />}
      iconBg="bg-brand-soft"
      title="Weekly planning"
      subtitle={`${format(weekStart, "MMM d")} to ${format(addDays(weekStart, 6), "MMM d, yyyy")}`}
      steps={steps}
      finishLabel="Finish planning"
      onFinish={() => saveWeeklyPlan({ planningCompleted: true })}
      wide
    />
  );
}
