import { useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { CheckCircle2, History, TrendingUp } from "lucide-react";
import { useStore } from "@/store/useStore";
import { getWeeklySummary } from "@/lib/api/rituals";
import { mapToClientTask } from "@/lib/api/plannerMapping";
import type { WeeklyReflection } from "@/lib/api/weekly";
import type { Task } from "@/types";
import { RitualFlow } from "./RitualFlow";
import { Chip, EmptyLine, RitualTaskRow, SectionTitle, StatsCard, WeeklyGoalsEditor, useFlowData } from "./RitualParts";

const keyOf = (date: Date) => format(date, "yyyy-MM-dd");

const PROMPTS: { key: keyof WeeklyReflection; label: string }[] = [
  { key: "wentWell", label: "What went well?" },
  { key: "didnt", label: "What didn't?" },
  { key: "change", label: "What will you change next week?" },
];

/** Guided weekly review (Phase 8): what got done, what slipped, reflect, goals. */
export function WeeklyReviewFlow({ onClose }: { onClose: () => void }) {
  const weekKey = useStore((state) => state.weeklyWeekKey) || keyOf(new Date());
  const weeklyStats = useStore((state) => state.weeklyStats);
  const savedReflection = useStore((state) => state.weeklyReflection);
  const backlogTasks = useStore((state) => state.backlogTasks);
  const scheduleFromBacklog = useStore((state) => state.scheduleFromBacklog);
  const moveTask = useStore((state) => state.moveTask);
  const sendToBacklog = useStore((state) => state.sendToBacklog);
  const deleteTask = useStore((state) => state.deleteTask);
  const saveWeeklyPlan = useStore((state) => state.saveWeeklyPlan);

  const weekStart = parseISO(weekKey);
  const nextWeekKey = keyOf(addDays(weekStart, 7));
  const [summary] = useFlowData(weekKey, getWeeklySummary);
  const [reflection, setReflection] = useState<WeeklyReflection>(savedReflection);
  const [handled, setHandled] = useState<Set<string>>(new Set());
  const markHandled = (id: string) => setHandled((prev) => new Set(prev).add(id));

  const done = (summary?.done ?? []).map(mapToClientTask);
  const slipped = (summary?.slipped ?? []).map(mapToClientTask).filter((task) => !handled.has(task.id));
  const isBacklog = (task: Task) => backlogTasks.some((item) => item.id === task.id);

  const doneByChannel = done.reduce<Record<string, Task[]>>((groups, task) => {
    (groups[task.tag] ??= []).push(task);
    return groups;
  }, {});

  const steps = [
    {
      title: "What got done",
      content: (
        <>
          {weeklyStats && weeklyStats.plannedCount > 0 && <StatsCard title="This week" stats={weeklyStats} />}
          {summary && done.length === 0 && <EmptyLine>No completed tasks yet this week.</EmptyLine>}
          {Object.entries(doneByChannel).map(([channel, items]) => (
            <div key={channel}>
              <SectionTitle icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}>
                #{channel} · {items.length}
              </SectionTitle>
              <div className="space-y-2">
                {items.map((task) => <RitualTaskRow key={task.id} task={task} muted />)}
              </div>
            </div>
          ))}
        </>
      ),
    },
    {
      title: "What slipped",
      content: (
        <div>
          <SectionTitle icon={<History className="h-4 w-4 text-muted-foreground" />}>Still open from this week</SectionTitle>
          <div className="space-y-2">
            {summary && slipped.length === 0 && <EmptyLine>Nothing slipped. Nice week.</EmptyLine>}
            {slipped.map((task) => (
              <RitualTaskRow
                key={task.id}
                task={task}
                actions={
                  <>
                    <Chip
                      onClick={() => {
                        if (isBacklog(task)) void scheduleFromBacklog(task.id, nextWeekKey);
                        else void moveTask(task.id, nextWeekKey);
                        markHandled(task.id);
                      }}
                    >
                      Next week
                    </Chip>
                    {!isBacklog(task) && (
                      <Chip onClick={() => { void sendToBacklog(task.id); markHandled(task.id); }}>Backlog</Chip>
                    )}
                    <Chip onClick={() => { void deleteTask(task.id); markHandled(task.id); }}>Delete</Chip>
                  </>
                }
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Reflect",
      content: (
        <div className="space-y-4">
          {PROMPTS.map((prompt) => (
            <div key={prompt.key}>
              <p className="mb-2 text-sm font-medium text-foreground">{prompt.label}</p>
              <textarea
                value={reflection[prompt.key]}
                onChange={(e) => setReflection({ ...reflection, [prompt.key]: e.target.value })}
                onBlur={() => void saveWeeklyPlan({ reflection })}
                rows={3}
                maxLength={3000}
                className="w-full rounded-lg border border-foreground/10 bg-muted/40 px-3 py-2 text-sm outline-none focus:border-brand/40"
              />
            </div>
          ))}
        </div>
      ),
    },
    { title: "Goals", content: <WeeklyGoalsEditor /> },
  ];

  return (
    <RitualFlow
      isOpen
      onClose={onClose}
      icon={<TrendingUp className="h-5 w-5 text-tag-health" />}
      iconBg="bg-health-soft"
      title="Weekly review"
      subtitle={`${format(weekStart, "MMM d")} to ${format(addDays(weekStart, 6), "MMM d, yyyy")}`}
      steps={steps}
      finishLabel="Complete review"
      onFinish={() => saveWeeklyPlan({ reflection, reviewCompleted: true })}
    />
  );
}
