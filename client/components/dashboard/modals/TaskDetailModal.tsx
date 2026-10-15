"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Circle,
  CheckCircle2,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Inbox,
  Play,
  Github,
  ExternalLink,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { format, addDays, isSameDay, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { formatTime12h } from "@/lib/formatDate";
import { buildRule, describeRule, parseRule, type RepeatPreset } from "@/lib/recurrence";
import { RepeatPicker } from "./RepeatPicker";
import { GitHubIssue, Subtask, Task } from "@/types";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type TaskTag = "work" | "personal" | "health";

const TAGS: { value: TaskTag; label: string; dot: string; active: string }[] = [
  {
    value: "work",
    label: "Work",
    dot: "bg-tag-work",
    active: "border-tag-work/40 bg-work-soft text-foreground",
  },
  {
    value: "personal",
    label: "Personal",
    dot: "bg-tag-personal",
    active: "border-tag-personal/40 bg-personal-soft text-foreground",
  },
  {
    value: "health",
    label: "Health",
    dot: "bg-tag-health",
    active: "border-tag-health/40 bg-health-soft text-foreground",
  },
];

const DURATIONS = [
  { value: "0:15", label: "15 min" },
  { value: "0:30", label: "30 min" },
  { value: "0:45", label: "45 min" },
  { value: "1:00", label: "1 hr" },
  { value: "1:30", label: "1½ hr" },
  { value: "2:00", label: "2 hr" },
];

// Stored as 24h "HH:mm" (see docs/roadmap/phase-0-foundations.md). Shown with formatTime12h.
const TIME_SLOTS = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

/**
 * Repeat settings for a task that belongs to a series. Save for all future applies the repeat
 * rule to the series. Title, time and duration edits above still change only this day.
 */
function RepeatSection({ ruleId, task }: { ruleId: string; task: Task }) {
  const { recurringRules, updateRecurringSeries, stopRecurringSeries } = useApp();
  const rule = recurringRules.find((item) => item.id === ruleId);
  const [repeat, setRepeat] = useState<{ preset: RepeatPreset; weekDays: number[] }>(() =>
    parseRule(rule?.rrule ?? "")
  );

  if (!rule) return null;

  const saveForFuture = () => {
    const rrule = buildRule(repeat.preset, repeat.weekDays, task.date);
    if (!rrule) {
      stopRecurringSeries(rule.id);
      return;
    }
    updateRecurringSeries(rule.id, {
      title: task.title,
      duration: task.duration,
      startTime: task.time ?? "",
      rrule,
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Repeat</p>
        <p className="mb-2 text-sm text-foreground">{describeRule(rule.rrule)}</p>
        <RepeatPicker
          preset={repeat.preset}
          weekDays={repeat.weekDays}
          monthDay={Number(task.date.slice(8, 10)) || undefined}
          onChange={setRepeat}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="brand" onClick={saveForFuture}>
          Save for all future
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => stopRecurringSeries(rule.id)}>
          Stop repeating
        </Button>
      </div>
    </div>
  );
}

function parseTaskDate(value: string) {
  return parse(value, "yyyy-MM-dd", new Date());
}

export function TaskDetailModal() {
  const {
    selectedTask,
    showTaskModal,
    setShowTaskModal,
    updateTask,
    deleteTask,
    setFocusMode,
    setFocusTask,
    sendToBacklog,
  } = useApp();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingSubTitle, setEditingSubTitle] = useState("");

  useEffect(() => {
    if (!selectedTask) return;
    setTitle(selectedTask.title);
    setNotes(selectedTask.notes ?? "");
    setNewSubtask("");
    setEditingSubId(null);
  }, [selectedTask?.id]);

  if (!showTaskModal || !selectedTask) return null;

  // A backlog task has no day yet. Parsing "" would give an invalid date, so fall back to today for the picker.
  const date = parseTaskDate(selectedTask.date || format(new Date(), "yyyy-MM-dd"));
  const subtasks = selectedTask.subtasks ?? [];
  const subDone = subtasks.filter((item) => item.completed).length;
  const githubIssue =
    selectedTask.source === "github"
      ? (selectedTask.sourceData as GitHubIssue | undefined)
      : undefined;

  const close = () => setShowTaskModal(false);

  const saveTitle = () => {
    const next = title.trim();
    if (!next || next === selectedTask.title) {
      setTitle(selectedTask.title);
      return;
    }
    updateTask(selectedTask.id, { title: next });
  };

  const saveNotes = () => {
    if (notes !== (selectedTask.notes ?? "")) {
      updateTask(selectedTask.id, { notes });
    }
  };

  const setSubtasks = (next: Subtask[]) => {
    updateTask(selectedTask.id, { subtasks: next });
  };

  const addSubtask = () => {
    const value = newSubtask.trim();
    if (!value) return;
    setSubtasks([
      ...subtasks,
      { id: crypto.randomUUID(), title: value, completed: false },
    ]);
    setNewSubtask("");
  };

  const saveSubtaskTitle = (id: string) => {
    const value = editingSubTitle.trim();
    setEditingSubId(null);
    if (!value) {
      setSubtasks(subtasks.filter((item) => item.id !== id));
      return;
    }
    setSubtasks(
      subtasks.map((item) =>
        item.id === id ? { ...item, title: value } : item
      )
    );
  };

  const startFocus = () => {
    setFocusTask(selectedTask);
    setFocusMode(true);
    close();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
        onClick={close}
      >
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute bottom-0 right-0 top-0 flex w-full max-w-xl flex-col overflow-y-auto border-l-2 border-foreground/15 bg-card shadow-soft"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/90 px-5 py-3 backdrop-blur-sm">
            <p className="text-sm font-medium text-foreground">Task</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={startFocus}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Start focus"
              >
                <Play className="h-4 w-4" />
              </button>
              {!selectedTask.inBacklog && (
                <button
                  type="button"
                  onClick={() => sendToBacklog(selectedTask.id)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Move to backlog"
                  title="Move to backlog"
                >
                  <Inbox className="h-4 w-4" />
                </button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                    aria-label="Delete task"
                    title={selectedTask.recurringTaskId ? "Delete this occurrence" : "Delete task"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="z-[80]">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes it from the board. You cannot undo this.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-white hover:bg-destructive/90"
                      onClick={() => deleteTask(selectedTask.id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-6 px-5 py-5">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() =>
                  updateTask(selectedTask.id, {
                    completed: !selectedTask.completed,
                  })
                }
                className="mt-1"
                aria-label={
                  selectedTask.completed ? "Mark incomplete" : "Mark complete"
                }
              >
                {selectedTask.completed ? (
                  <CheckCircle2 className="h-6 w-6 text-brand" />
                ) : (
                  <Circle className="h-6 w-6 text-muted-foreground hover:text-foreground" />
                )}
              </button>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className={cn(
                  "w-full bg-transparent text-xl font-semibold text-foreground outline-none",
                  selectedTask.completed && "line-through opacity-60"
                )}
              />
            </div>

            <div className="flex gap-2">
              {TAGS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() =>
                    updateTask(selectedTask.id, { tag: item.value })
                  }
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm transition-colors",
                    selectedTask.tag === item.value
                      ? item.active
                      : "border-foreground/10 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", item.dot)} />
                  {item.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-2 text-xs text-muted-foreground">Date</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg border border-foreground/10 bg-muted/40 px-3 py-2 text-sm hover:border-foreground/20"
                    >
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedTask.inBacklog ? "Backlog" : format(date, "MMM d")}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="z-[60] w-auto p-0" align="start">
                    <div className="flex gap-1 border-b border-border p-2">
                      {[
                        { label: "Today", value: new Date() },
                        { label: "Tomorrow", value: addDays(new Date(), 1) },
                      ].map((qd) => (
                        <button
                          key={qd.label}
                          type="button"
                          onClick={() =>
                            updateTask(selectedTask.id, {
                              date: format(qd.value, "yyyy-MM-dd"),
                            })
                          }
                          className={cn(
                            "rounded-md px-3 py-1.5 text-xs transition-colors",
                            isSameDay(date, qd.value)
                              ? "bg-brand-soft text-brand"
                              : "bg-muted hover:bg-muted/80"
                          )}
                        >
                          {qd.label}
                        </button>
                      ))}
                    </div>
                    <CalendarComponent
                      mode="single"
                      selected={selectedTask.inBacklog ? undefined : date}
                      onSelect={(d) =>
                        d &&
                        updateTask(selectedTask.id, {
                          date: format(d, "yyyy-MM-dd"),
                        })
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <p className="mb-2 text-xs text-muted-foreground">Start</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg border border-foreground/10 bg-muted/40 px-3 py-2 text-sm hover:border-foreground/20"
                    >
                      <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span
                        className={cn(
                          !selectedTask.time && "text-muted-foreground"
                        )}
                      >
                        {selectedTask.time ? formatTime12h(selectedTask.time) : "Anytime"}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="z-[60] w-64 p-3" align="end">
                    <button
                      type="button"
                      onClick={() =>
                        updateTask(selectedTask.id, { time: "" })
                      }
                      className={cn(
                        "mb-2 w-full rounded-lg border px-3 py-2 text-sm",
                        !selectedTask.time
                          ? "border-brand/40 bg-brand-soft text-brand"
                          : "border-foreground/10 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Anytime
                    </button>
                    <div className="grid grid-cols-2 gap-1.5">
                      {TIME_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() =>
                            updateTask(selectedTask.id, { time: slot })
                          }
                          className={cn(
                            "rounded-lg border px-2 py-1.5 text-sm",
                            selectedTask.time === slot
                              ? "border-brand/40 bg-brand-soft text-brand"
                              : "border-foreground/10 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {formatTime12h(slot)}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {selectedTask.recurringTaskId && (
              <div className="mb-5">
                <RepeatSection ruleId={selectedTask.recurringTaskId} task={selectedTask} />
              </div>
            )}

            <div>
              <p className="mb-2 text-xs text-muted-foreground">Duration</p>
              <div className="flex flex-wrap gap-1.5">
                {DURATIONS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      updateTask(selectedTask.id, { duration: item.value })
                    }
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-xs",
                      selectedTask.duration === item.value
                        ? "border-brand/40 bg-brand-soft text-brand"
                        : "border-foreground/10 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Subtasks</p>
                {subtasks.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {subDone} of {subtasks.length}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                {subtasks.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-lg border border-foreground/10 px-2 py-1.5"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSubtasks(
                          subtasks.map((sub) =>
                            sub.id === item.id
                              ? { ...sub, completed: !sub.completed }
                              : sub
                          )
                        )
                      }
                    >
                      {item.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-brand" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {editingSubId === item.id ? (
                      <input
                        autoFocus
                        value={editingSubTitle}
                        onChange={(e) => setEditingSubTitle(e.target.value)}
                        onBlur={() => saveSubtaskTitle(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSubId(item.id);
                          setEditingSubTitle(item.title);
                        }}
                        className={cn(
                          "min-w-0 flex-1 text-left text-sm",
                          item.completed &&
                            "text-muted-foreground line-through"
                        )}
                      >
                        {item.title}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setSubtasks(subtasks.filter((sub) => sub.id !== item.id))
                      }
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                      aria-label="Remove subtask"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addSubtask();
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    placeholder="Add a subtask"
                    className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    disabled={!newSubtask.trim()}
                  >
                    Add
                  </Button>
                </form>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs text-muted-foreground">Notes</p>
              <textarea
                placeholder="Anything to remember..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
                className="min-h-[110px] w-full resize-none rounded-xl border border-foreground/10 bg-muted/30 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            {selectedTask.link && !githubIssue && (
              <a
                href={selectedTask.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-tag-personal hover:underline"
              >
                Open source
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}

            {githubIssue && (
              <div className="border-t border-border pt-6">
                <div className="mb-4 flex items-center gap-2">
                  <Github className="h-5 w-5 text-muted-foreground" />
                  <a
                    href={githubIssue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-tag-personal hover:underline"
                  >
                    GitHub Issue
                  </a>
                </div>
                <h3 className="mb-3 text-lg font-semibold text-foreground">
                  {githubIssue.title} #{githubIssue.number}
                </h3>
                <a
                  href={githubIssue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-tag-personal hover:underline"
                >
                  Open in GitHub
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
