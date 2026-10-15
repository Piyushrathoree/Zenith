import { useEffect, useState } from "react";
import { addDays, format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle2, CircleDashed, Moon, Sparkles } from "lucide-react";
import { useStore } from "@/store/useStore";
import { getDailySummary, updateDailyRitual } from "@/lib/api/rituals";
import { RitualFlow } from "./RitualFlow";
import { Chip, EmptyLine, RitualTaskRow, SectionTitle, useFlowData } from "./RitualParts";

const keyOf = (date: Date) => format(date, "yyyy-MM-dd");

/** Guided daily shutdown (Phase 8): done today, not done, highlight, close. */
export function DailyShutdownFlow({ onClose }: { onClose: () => void }) {
  const today = keyOf(new Date());
  const tomorrow = keyOf(addDays(new Date(), 1));
  const tasks = useStore((state) => state.tasks);
  const moveTask = useStore((state) => state.moveTask);
  const sendToBacklog = useStore((state) => state.sendToBacklog);
  const loadTodayRitual = useStore((state) => state.loadTodayRitual);

  const [summary] = useFlowData(today, getDailySummary);
  const [highlight, setHighlight] = useState("");
  const [note, setNote] = useState("");
  const [left, setLeft] = useState<Set<string>>(new Set());

  // Prefill a highlight saved earlier today, once the summary arrives.
  useEffect(() => {
    if (!summary) return;
    const timer = window.setTimeout(() => {
      setHighlight((current) => current || summary.highlight);
      setNote((current) => current || summary.reflection);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [summary]);

  const todayTasks = tasks.filter((task) => task.date === today);
  const done = todayTasks.filter((task) => task.completed);
  const open = todayTasks.filter((task) => !task.completed && !left.has(task.id));
  const leaveIt = (id: string) => setLeft((prev) => new Set(prev).add(id));

  const steps = [
    {
      title: "Done today",
      content: (
        <div>
          <SectionTitle icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}>
            You finished {done.length} of {todayTasks.length}
          </SectionTitle>
          <div className="space-y-2">
            {done.length === 0 && <EmptyLine>Nothing marked done today. That happens.</EmptyLine>}
            {done.map((task) => <RitualTaskRow key={task.id} task={task} muted />)}
          </div>
        </div>
      ),
    },
    {
      title: "Not done",
      content: (
        <div>
          <SectionTitle icon={<CircleDashed className="h-4 w-4 text-muted-foreground" />}>Still open</SectionTitle>
          <p className="mb-2 text-xs text-muted-foreground">Anything you leave rolls over to tomorrow on its own.</p>
          <div className="space-y-2">
            {open.length === 0 && <EmptyLine>All clear.</EmptyLine>}
            {open.map((task) => (
              <RitualTaskRow
                key={task.id}
                task={task}
                actions={
                  <>
                    <Chip onClick={() => void moveTask(task.id, tomorrow)}>Tomorrow</Chip>
                    <Chip onClick={() => void sendToBacklog(task.id)}>Backlog</Chip>
                    <Chip onClick={() => leaveIt(task.id)}>Leave it</Chip>
                  </>
                }
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Highlight",
      content: (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Highlight of the day</p>
            <input
              type="text"
              value={highlight}
              onChange={(e) => setHighlight(e.target.value)}
              maxLength={500}
              placeholder="One thing worth remembering"
              className="w-full rounded-lg border border-foreground/10 bg-muted/40 px-3 py-2 text-sm outline-none focus:border-brand/40"
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Note (optional)</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              maxLength={5000}
              placeholder="Anything to carry into tomorrow?"
              className="w-full rounded-lg border border-foreground/10 bg-muted/40 px-3 py-2 text-sm outline-none focus:border-brand/40"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Close",
      content: (
        <div className="rounded-lg border border-foreground/10 bg-muted/30 p-4">
          <p className="flex items-center gap-2 text-sm text-foreground">
            <Sparkles className="h-4 w-4 text-brand" />
            {done.length} done today. Time to switch off.
          </p>
          {highlight && <p className="mt-2 text-sm text-muted-foreground">Highlight: {highlight}</p>}
        </div>
      ),
    },
  ];

  return (
    <RitualFlow
      isOpen
      onClose={onClose}
      icon={<Moon className="h-5 w-5 text-tag-personal" />}
      iconBg="bg-personal-soft"
      title="Daily shutdown"
      subtitle={format(new Date(), "EEEE, MMMM d")}
      steps={steps}
      finishLabel="Close my day"
      onFinish={async () => {
        try {
          await updateDailyRitual(today, { shutdown: true, highlight: highlight.trim(), reflection: note });
          await loadTodayRitual();
          return true;
        } catch {
          toast.error("Could not save your shutdown, please try again");
          return false;
        }
      }}
    />
  );
}
