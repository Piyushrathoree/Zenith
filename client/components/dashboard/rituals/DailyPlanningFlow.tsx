import { useState } from "react";
import { addDays, format } from "date-fns";
import { toast } from "sonner";
import { CalendarClock, History, Inbox, ListChecks, Repeat, Sunrise } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { getDailySummary, updateDailyRitual } from "@/lib/api/rituals";
import { updateDailyPlanner } from "@/lib/api/planner";
import { mapToClientTask } from "@/lib/api/plannerMapping";
import { formatMinutes, formatTime12h } from "@/lib/formatDate";
import { DEFAULT_DAILY_CAPACITY_MINUTES, plannedMinutes } from "@/lib/timebox";
import { Button } from "@/components/ui/button";
import { TimeGrid } from "@/components/dashboard/dayview/TimeGrid";
import { RitualFlow } from "./RitualFlow";
import { IntegrationPickList } from "./IntegrationPickList";
import { Chip, EmptyLine, RitualTaskRow, SectionTitle, useFlowData } from "./RitualParts";

const keyOf = (date: Date) => format(date, "yyyy-MM-dd");
const DURATIONS = [
  { value: "0:15", label: "15m" },
  { value: "0:30", label: "30m" },
  { value: "0:45", label: "45m" },
  { value: "1:00", label: "1h" },
  { value: "1:30", label: "1½h" },
  { value: "2:00", label: "2h" },
];
const LEGACY_DISMISS_KEY = "zenith_rituals_conversion_dismissed";

/** Guided daily planning (Phase 8): yesterday, pull in, time box, commit. */
export function DailyPlanningFlow({ onClose }: { onClose: () => void }) {
  const today = keyOf(new Date());
  const yesterday = keyOf(addDays(new Date(), -1));
  const tasks = useStore((state) => state.tasks);
  const backlogTasks = useStore((state) => state.backlogTasks);
  const dailyTasks = useStore((state) => state.dailyTasks);
  const addTask = useStore((state) => state.addTask);
  const updateTask = useStore((state) => state.updateTask);
  const deleteTask = useStore((state) => state.deleteTask);
  const sendToBacklog = useStore((state) => state.sendToBacklog);
  const scheduleFromBacklog = useStore((state) => state.scheduleFromBacklog);
  const createRecurringTask = useStore((state) => state.createRecurringTask);
  const loadTodayRitual = useStore((state) => state.loadTodayRitual);
  const addIntegrationItem = useStore((state) => state.addIntegrationItem);

  const [yesterdaySummary] = useFlowData(yesterday, getDailySummary);
  const [todaySummary] = useFlowData(today, getDailySummary);
  const [handled, setHandled] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");
  const [converting, setConverting] = useState(false);
  const [legacyDismissed, setLegacyDismissed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(LEGACY_DISMISS_KEY) === "1"
  );
  const markHandled = (id: string) => setHandled((prev) => new Set(prev).add(id));

  const todayTasks = tasks.filter((task) => task.date === today);
  const scheduled = todayTasks.filter((task) => task.time);
  const carriedOver = (todaySummary?.carriedOver ?? []).map(mapToClientTask).filter((task) => !handled.has(task.id));
  const doneYesterday = (yesterdaySummary?.done ?? []).map(mapToClientTask);
  const planned = plannedMinutes(todayTasks);
  const capacity = DEFAULT_DAILY_CAPACITY_MINUTES;
  const over = planned > capacity;

  // D3: the old ritual checklist becomes daily repeating tasks, once.
  const convertLegacyRituals = async () => {
    setConverting(true);
    try {
      for (const item of dailyTasks) {
        await createRecurringTask({
          title: item.title,
          channel: item.tag,
          duration: item.duration,
          startTime: item.time ?? "",
          rrule: "FREQ=DAILY",
          startsOn: today,
        });
        await deleteTask(item.id);
      }
      await updateDailyPlanner(today, { tasks: [] });
      useStore.setState({ dailyTasks: [] });
      toast.success("Your rituals are now daily repeating tasks");
    } catch {
      toast.error("Could not convert every ritual, please try again");
    } finally {
      setConverting(false);
    }
  };

  const dismissLegacy = () => {
    window.localStorage.setItem(LEGACY_DISMISS_KEY, "1");
    setLegacyDismissed(true);
  };

  const quickAdd = () => {
    const title = draft.trim();
    if (!title) return;
    void addTask({ title, duration: "0:30", tag: "work", date: today, completed: false });
    setDraft("");
  };

  const steps = [
    {
      title: "Yesterday",
      content: (
        <>
          {dailyTasks.length > 0 && !legacyDismissed && (
            <div className="rounded-lg border border-foreground/10 bg-muted/30 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                Turn your rituals into repeating tasks?
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                The old ritual checklist is going away. Your {dailyTasks.length}{" "}
                {dailyTasks.length === 1 ? "ritual becomes a daily repeating task" : "rituals become daily repeating tasks"} on your board.
              </p>
              <div className="mt-3 flex gap-2">
                <Button type="button" size="sm" variant="brand" disabled={converting} onClick={convertLegacyRituals}>
                  {converting ? "Converting..." : "Convert"}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={dismissLegacy}>
                  Not now
                </Button>
              </div>
            </div>
          )}
          <div>
            <SectionTitle icon={<History className="h-4 w-4 text-muted-foreground" />}>Carried over to today</SectionTitle>
            <div className="space-y-2">
              {todaySummary && carriedOver.length === 0 && <EmptyLine>Nothing carried over. Clean slate.</EmptyLine>}
              {carriedOver.map((task) => (
                <RitualTaskRow
                  key={task.id}
                  task={task}
                  actions={
                    <>
                      <Chip onClick={() => markHandled(task.id)}>Keep today</Chip>
                      <Chip onClick={() => { void sendToBacklog(task.id); markHandled(task.id); }}>Backlog</Chip>
                      <Chip onClick={() => { void deleteTask(task.id); markHandled(task.id); }}>Delete</Chip>
                    </>
                  }
                />
              ))}
            </div>
          </div>
          <div>
            <SectionTitle icon={<ListChecks className="h-4 w-4 text-muted-foreground" />}>
              Done yesterday{yesterdaySummary ? ` · ${doneYesterday.length}` : ""}
            </SectionTitle>
            <div className="space-y-2">
              {yesterdaySummary && doneYesterday.length === 0 && <EmptyLine>No completed tasks yesterday.</EmptyLine>}
              {doneYesterday.slice(0, 5).map((task) => <RitualTaskRow key={task.id} task={task} muted />)}
            </div>
          </div>
        </>
      ),
    },
    {
      title: "Pull in",
      content: (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <SectionTitle icon={<Sunrise className="h-4 w-4 text-muted-foreground" />}>Today · {todayTasks.length}</SectionTitle>
            <div className="space-y-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && quickAdd()}
                placeholder="Add a task for today and press Enter..."
                className="w-full rounded-lg border border-foreground/10 bg-muted/40 px-3 py-2 text-sm outline-none focus:border-brand/40"
              />
              {todayTasks.length === 0 && <EmptyLine>Nothing planned yet.</EmptyLine>}
              {todayTasks.map((task) => (
                <RitualTaskRow
                  key={task.id}
                  task={task}
                  muted={task.completed}
                  actions={<Chip onClick={() => void sendToBacklog(task.id)}>Backlog</Chip>}
                />
              ))}
            </div>
          </div>
          <div>
            <SectionTitle icon={<Inbox className="h-4 w-4 text-muted-foreground" />}>From your backlog</SectionTitle>
            <div className="space-y-2">
              {backlogTasks.length === 0 && <EmptyLine>Your backlog is empty.</EmptyLine>}
              {backlogTasks.map((task) => (
                <RitualTaskRow
                  key={task.id}
                  task={task}
                  actions={<Chip onClick={() => void scheduleFromBacklog(task.id, today)}>+ Today</Chip>}
                />
              ))}
            </div>
            <div className="mt-4">
              <IntegrationPickList
                renderActions={(item) => <Chip onClick={() => void addIntegrationItem(item, "today")}>+ Today</Chip>}
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Time box",
      content: (
        <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Set how long each task takes, then drag it onto a time.</p>
            {todayTasks.filter((task) => !task.completed).map((task) => (
              <div key={task.id} className="space-y-1">
                <RitualTaskRow
                  task={task}
                  draggable="task"
                  actions={task.time ? <span className="text-xs text-muted-foreground">{formatTime12h(task.time)}</span> : undefined}
                />
                <div className="flex flex-wrap gap-1">
                  {DURATIONS.map((d) => (
                    <Chip key={d.value} active={task.duration === d.value} onClick={() => void updateTask(task.id, { duration: d.value })}>
                      {d.label}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex h-96 overflow-hidden rounded-lg border border-foreground/10">
            <TimeGrid date={today} tasks={scheduled} scrollToFirstTask />
          </div>
        </div>
      ),
    },
    {
      title: "Commit",
      content: (
        <div className="space-y-3">
          <SectionTitle icon={<CalendarClock className="h-4 w-4 text-muted-foreground" />}>Your day</SectionTitle>
          <p className="text-sm text-foreground">
            {todayTasks.length} {todayTasks.length === 1 ? "task" : "tasks"}, {formatMinutes(planned)} planned of{" "}
            {formatMinutes(capacity)}.
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", over ? "bg-destructive" : "bg-brand")}
              style={{ width: `${Math.min(100, (planned / capacity) * 100)}%` }}
            />
          </div>
          {over && (
            <p className="text-sm text-destructive">
              You planned {formatMinutes(planned)}, your day has {formatMinutes(capacity)}. Move something to the backlog?
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <RitualFlow
      isOpen
      onClose={onClose}
      icon={<Sunrise className="h-5 w-5 text-tag-work" />}
      iconBg="bg-work-soft"
      title="Daily planning"
      subtitle={format(new Date(), "EEEE, MMMM d")}
      steps={steps}
      finishLabel="Start my day"
      onFinish={async () => {
        try {
          await updateDailyRitual(today, { planned: true });
          await loadTodayRitual();
          return true;
        } catch {
          toast.error("Could not save your plan, please try again");
          return false;
        }
      }}
      wide
    />
  );
}
